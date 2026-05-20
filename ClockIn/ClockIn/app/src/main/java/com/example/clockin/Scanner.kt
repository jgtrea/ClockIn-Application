package com.example.clockin

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Rect
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashlightOff
import androidx.compose.material.icons.filled.FlashlightOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.navigation.NavController
import com.example.clockin.model.*
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.launch
import java.util.concurrent.Executors
import kotlin.math.min

@Composable
fun ScannerScreen(
    navController: NavController,
    isBeaconFound: Boolean,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val bracketSizeDp = 280.dp

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED,
        )
    }

    var isFlashlightOn by remember { mutableStateOf(false) }
    var isProcessing by remember { mutableStateOf(false) }
    var lastScanTime by remember { mutableStateOf(0L) }
    val cooldownDuration = 2000L

    val launcher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.RequestPermission(),
            onResult = { granted -> hasCameraPermission = granted },
        )

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            launcher.launch(Manifest.permission.CAMERA)
        }
    }

    Scaffold(
        bottomBar = { CustomBottomNavigation(navController, "scan_qr") },
    ) { paddingValues ->
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color.Black),
        ) {
            if (hasCameraPermission) {
                CameraPreview(
                    modifier = Modifier.fillMaxSize(),
                    torchOn = isFlashlightOn,
                    onQrCodeDetected = { code ->
                        val currentTime = System.currentTimeMillis()
                        if (!isProcessing && (currentTime - lastScanTime > cooldownDuration)) {
                            isProcessing = true
                            lastScanTime = currentTime

                            if (!WifiChecker.isWifiEnabled(context)) {
                                NotificationManager.show("WiFi Required", "Please enable WiFi.")
                                isProcessing = false
                                return@CameraPreview
                            }
                            if (!WifiChecker.isConnectedToAllowedWifi(context)) {
                                NotificationManager.show("Wrong WiFi", "Connect to: ${WifiChecker.getAllowedWifiSsid()}")
                                isProcessing = false
                                return@CameraPreview
                            }

                            if (!isBeaconFound) {
                                NotificationManager.show("Out of Range", "You are too far from the room beacon!")
                                isProcessing = false
                                return@CameraPreview
                            }

                            scope.launch {
                                val result = SupabaseManager.verifyQrCode(code, context, isBeaconFound)
                                if (result.isSuccess) {
                                    NotificationManager.show("Success ✓", result.getOrNull() ?: "Recorded!")
                                    navController.popBackStack()
                                } else {
                                    NotificationManager.show("Failed ✗", result.exceptionOrNull()?.message ?: "Error")
                                }
                                isProcessing = false
                            }
                        }
                    },
                )

                ScannerOverlay(bracketSizeDp)
            } else {
                Column(
                    modifier = Modifier.fillMaxSize().padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("Camera permission is required.", color = Color.White, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { launcher.launch(Manifest.permission.CAMERA) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66)),
                    ) { Text("Grant Permission") }
                }
            }

            Column(
                modifier =
                    Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 40.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = if (isBeaconFound) Color(0xFF4CAF50) else Color(0xFFFF5252),
                    modifier = Modifier.padding(bottom = 8.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            if (isBeaconFound) Icons.Default.FlashlightOn else Icons.Default.FlashlightOff,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isBeaconFound) "Beacon: In Range" else "Beacon: Out of Range",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                Text(
                    text = if (isProcessing) "Verifying..." else "Align QR code within frame",
                    color = if (isProcessing) Color.Yellow else Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Medium,
                )
            }

            Box(
                modifier =
                    Modifier
                        .size(bracketSizeDp)
                        .align(Alignment.Center),
            ) {
                ScannerBracket(Modifier.align(Alignment.TopStart), false, false)
                ScannerBracket(Modifier.align(Alignment.TopEnd), true, false)
                ScannerBracket(Modifier.align(Alignment.BottomStart), false, true)
                ScannerBracket(Modifier.align(Alignment.BottomEnd), true, true)
            }

            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 80.dp),
                horizontalArrangement = Arrangement.Center,
            ) {
                ScannerActionButton(
                    icon = if (isFlashlightOn) Icons.Default.FlashlightOff else Icons.Default.FlashlightOn,
                    onClick = { isFlashlightOn = !isFlashlightOn },
                )
            }
        }
    }
}

@Composable
fun ScannerOverlay(boxSizeDp: androidx.compose.ui.unit.Dp) {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val canvasWidth = size.width
        val canvasHeight = size.height
        val boxSizePx = boxSizeDp.toPx()
        val left = (canvasWidth - boxSizePx) / 2
        val top = (canvasHeight - boxSizePx) / 2

        with(drawContext.canvas.nativeCanvas) {
            val checkPoint = saveLayer(null, null)
            drawRect(Color.Black.copy(alpha = 0.6f))
            drawRect(
                topLeft = Offset(left, top),
                size = Size(boxSizePx, boxSizePx),
                color = Color.Transparent,
                blendMode = BlendMode.Clear,
            )
            restoreToCount(checkPoint)
        }
    }
}

@OptIn(ExperimentalGetImage::class)
@Composable
fun CameraPreview(
    modifier: Modifier = Modifier,
    torchOn: Boolean,
    onQrCodeDetected: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }
    var camera by remember { mutableStateOf<Camera?>(null) }

    val currentOnQrCodeDetected by rememberUpdatedState(onQrCodeDetected)

    LaunchedEffect(torchOn) {
        camera?.cameraControl?.enableTorch(torchOn)
    }

    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val executor = ContextCompat.getMainExecutor(ctx)

            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview =
                    Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                val imageAnalyzer =
                    ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also {
                            it.setAnalyzer(Executors.newSingleThreadExecutor()) { imageProxy ->
                                processImageProxy(imageProxy) { code ->
                                    currentOnQrCodeDetected(code)
                                }
                            }
                        }

                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                try {
                    cameraProvider.unbindAll()
                    camera =
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageAnalyzer,
                        )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }, executor)
            previewView
        },
        modifier = modifier,
    )
}

@OptIn(ExperimentalGetImage::class)
private fun processImageProxy(
    imageProxy: ImageProxy,
    onSuccess: (String) -> Unit,
) {
    val mediaImage = imageProxy.image
    if (mediaImage != null) {
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        val imgWidth = image.width
        val imgHeight = image.height
        val scanBoxSize = min(imgWidth, imgHeight) * 0.5f
        val centerRect =
            Rect(
                ((imgWidth - scanBoxSize) / 2).toInt(),
                ((imgHeight - scanBoxSize) / 2).toInt(),
                ((imgWidth + scanBoxSize) / 2).toInt(),
                ((imgHeight + scanBoxSize) / 2).toInt(),
            )

        val options = BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
        val scanner = BarcodeScanning.getClient(options)

        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val box = barcode.boundingBox
                    if (box != null) {
                        val centerX = box.centerX()
                        val centerY = box.centerY()
                        if (centerRect.contains(centerX, centerY)) {
                            barcode.rawValue?.let { onSuccess(it) }
                        }
                    }
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    } else {
        imageProxy.close()
    }
}

@Composable
fun ScannerBracket(
    modifier: Modifier,
    rotateX: Boolean,
    rotateY: Boolean,
) {
    Box(
        modifier =
            modifier
                .size(45.dp)
                .border(
                    width = 4.dp,
                    color = Color.White,
                    shape =
                        RoundedCornerShape(
                            topStart = if (!rotateX && !rotateY) 12.dp else 0.dp,
                            topEnd = if (rotateX && !rotateY) 12.dp else 0.dp,
                            bottomStart = if (!rotateX && rotateY) 12.dp else 0.dp,
                            bottomEnd = if (rotateX && rotateY) 12.dp else 0.dp,
                        ),
                ),
    )
}

@Composable
fun ScannerActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier.size(70.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)).clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) { Icon(imageVector = icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp)) }
}
