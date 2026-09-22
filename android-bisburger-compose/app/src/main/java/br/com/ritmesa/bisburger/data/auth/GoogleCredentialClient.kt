package br.com.ritmesa.bisburger.data.auth

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

class GoogleCredentialClient(private val activity: Activity) {
    private val credentialManager = CredentialManager.create(activity)

    suspend fun getIdToken(): String {
        val option = GetSignInWithGoogleOption.Builder(WEB_CLIENT_ID).build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build()
        val credential = try {
            credentialManager.getCredential(activity, request).credential
        } catch (error: NoCredentialException) {
            throw IllegalStateException("Nenhuma conta Google está disponível para entrar.", error)
        }
        if (
            credential !is CustomCredential ||
            credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            error("O Google não retornou uma credencial válida.")
        }
        return GoogleIdTokenCredential.createFrom(credential.data).idToken
    }

    companion object {
        private const val WEB_CLIENT_ID =
            "836965237182-kmgamm79oo3ft7kgifqom9ulj5u37mt2.apps.googleusercontent.com"
    }
}
