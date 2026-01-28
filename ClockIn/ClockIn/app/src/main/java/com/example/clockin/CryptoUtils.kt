package com.example.clockin

import android.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec

object CryptoUtils {
    private const val ALGORITHM = "AES"
    private const val TRANSFORMATION = "AES/ECB/PKCS5Padding"
    private const val SECRET_KEY = "CSclockinapp2026"

    private fun getKey(): SecretKeySpec {
        return SecretKeySpec(SECRET_KEY.toByteArray(Charsets.UTF_8), ALGORITHM)
    }

    fun encrypt(input: String): String {
        return try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, getKey())
            val cipherText = cipher.doFinal(input.toByteArray(Charsets.UTF_8))
            Base64.encodeToString(cipherText, Base64.NO_WRAP)
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }

    fun decrypt(cipherText: String): String {
        return try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, getKey())
            val decodedBytes = Base64.decode(cipherText, Base64.NO_WRAP)
            val plainText = cipher.doFinal(decodedBytes)
            String(plainText, Charsets.UTF_8)
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }
}
