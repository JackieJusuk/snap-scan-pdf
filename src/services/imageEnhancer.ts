import { Skia, ImageFormat, TileMode, FilterMode, MipmapMode } from "@shopify/react-native-skia";
import * as FileSystem from "expo-file-system";

// 원본 대비 밝기(대비 강화) 이득. 결과 = (원본 - 주변 평균) * GAIN + 0.5, 0~1로 클램프.
// 값이 클수록 더 강하게 흑백에 가깝게 밀어붙인다. 실기기 촬영본으로 눈으로 보며 조정할 값.
const GAIN = 6;
// 지역 평균(그림자/조명 얼룩)을 추정하기 위한 블러 반경 비율(이미지 짧은 변 대비).
// 너무 작으면 글씨까지 평균에 섞여 사라지고, 너무 크면 전역 필터와 다를 게 없어진다.
const BLUR_RADIUS_RATIO = 0.02;

// R,G,B를 동일한 휘도 가중치로 섞어 흑백으로 만드는 컬러 매트릭스(0~1 스케일).
const GRAYSCALE_MATRIX = [
  0.299, 0.587, 0.114, 0, 0,
  0.299, 0.587, 0.114, 0, 0,
  0.299, 0.587, 0.114, 0, 0,
  0, 0, 0, 1, 0,
];

// 원본과, 그 원본을 크게 블러 처리해 얻은 "그 자리의 평균 밝기(=그림자/조명 얼룩)"를
// 비교해서, 주변보다 확실히 어두운 픽셀(글씨)만 검게, 나머지(종이 배경과 그 위의
// 그림자)는 다 희게 미는 셰이더. 전역 대비 보정과 달리 그림자 진 영역과 밝은 영역을
// "그 지역 기준"으로 각각 판단하기 때문에 종이 얼룩/구겨짐 그림자가 훨씬 옅어진다.
const ADAPTIVE_THRESHOLD_SKSL = `
uniform shader image;
uniform shader blurred;
uniform float gain;

half4 main(float2 coord) {
  half4 src = image.eval(coord);
  half4 bg = blurred.eval(coord);
  half v = clamp((src.r - bg.r) * gain + 0.5, 0.0, 1.0);
  return half4(v, v, v, 1.0);
}
`;

/**
 * 스캔한 페이지 이미지에 지역 적응형 대비 보정("적응형 이진화"에 가까운 문서 스캔
 * 모드)을 적용한 새 이미지 파일을 만들어 그 경로를 반환한다. 원본 파일은 건드리지
 * 않는다. 셰이더 컴파일/디코딩 등 어느 단계든 실패하면 원본 경로를 그대로 돌려준다 —
 * 이 보정은 "있으면 좋은" 개선이지, 스캔 자체를 막을 이유는 아니기 때문이다.
 */
export async function enhanceDocumentImage(imageUri: string): Promise<string> {
  try {
    const data = await Skia.Data.fromURI(imageUri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return imageUri;

    const width = image.width();
    const height = image.height();

    // 1) 흑백 변환
    const graySurface = Skia.Surface.MakeOffscreen(width, height);
    if (!graySurface) return imageUri;
    const grayPaint = Skia.Paint();
    grayPaint.setColorFilter(Skia.ColorFilter.MakeMatrix(GRAYSCALE_MATRIX));
    graySurface.getCanvas().drawImage(image, 0, 0, grayPaint);
    graySurface.flush();
    const grayImage = graySurface.makeImageSnapshot();

    // 2) 그 흑백 이미지를 크게 블러 처리 = "이 지점 주변의 평균 밝기"(그림자/조명 얼룩) 추정
    const blurSurface = Skia.Surface.MakeOffscreen(width, height);
    if (!blurSurface) return imageUri;
    const sigma = Math.max(8, Math.min(width, height) * BLUR_RADIUS_RATIO);
    const blurPaint = Skia.Paint();
    blurPaint.setImageFilter(Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, null));
    blurSurface.getCanvas().drawImage(grayImage, 0, 0, blurPaint);
    blurSurface.flush();
    const blurredImage = blurSurface.makeImageSnapshot();

    // 3) 원본(흑백) vs 지역 평균을 셰이더로 비교해 최종 보정 이미지 생성
    const effect = Skia.RuntimeEffect.Make(ADAPTIVE_THRESHOLD_SKSL);
    if (!effect) return imageUri;

    const imageShader = grayImage.makeShaderOptions(
      TileMode.Clamp,
      TileMode.Clamp,
      FilterMode.Linear,
      MipmapMode.None
    );
    const blurredShader = blurredImage.makeShaderOptions(
      TileMode.Clamp,
      TileMode.Clamp,
      FilterMode.Linear,
      MipmapMode.None
    );
    const finalShader = effect.makeShaderWithChildren([GAIN], [imageShader, blurredShader]);

    const outputSurface = Skia.Surface.MakeOffscreen(width, height);
    if (!outputSurface) return imageUri;
    const shaderPaint = Skia.Paint();
    shaderPaint.setShader(finalShader);
    outputSurface.getCanvas().drawRect(Skia.XYWHRect(0, 0, width, height), shaderPaint);
    outputSurface.flush();

    const snapshot = outputSurface.makeImageSnapshot();
    const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);

    const outputUri = `${FileSystem.cacheDirectory}enhanced-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.jpg`;
    await FileSystem.writeAsStringAsync(outputUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return outputUri;
  } catch (error) {
    console.warn("문서 이미지 보정 실패, 원본 이미지를 사용합니다.", error);
    return imageUri;
  }
}
