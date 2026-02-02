package com.example.clockin

import android.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec

object CryptoUtils {
    private const val ALGORITHM = "AES"
    private const val TRANSFORMATION = "AES/ECB/PKCS5Padding"
    private const val SECRET_KEY = "CSclockinapp2026"

    fun encrypt(input: String): String {
        return try {
            val key = SecretKeySpec(SECRET_KEY.toByteArray(), ALGORITHM)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, key)
            val encryptedBytes = cipher.doFinal(input.toByteArray())
            Base64.encodeToString(encryptedBytes, Base64.DEFAULT).trim()
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }

    fun decrypt(input: String): String {
        return try {
            val key = SecretKeySpec(SECRET_KEY.toByteArray(), ALGORITHM)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, key)
            val decodedBytes = Base64.decode(input, Base64.DEFAULT)
            val decryptedBytes = cipher.doFinal(decodedBytes)
            String(decryptedBytes)
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }
}