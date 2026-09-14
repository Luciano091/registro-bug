package br.com.ritmesa.bisburger;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    private static final String WEB_CLIENT_ID = "836965237182-kmgamm79oo3ft7kgifqom9ulj5u37mt2.apps.googleusercontent.com";

    @PluginMethod
    public void signIn(PluginCall call) {
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(WEB_CLIENT_ID).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build();

        CredentialManager.create(getActivity()).getCredentialAsync(
            getActivity(),
            request,
            null,
            getActivity().getMainExecutor(),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    Credential credential = result.getCredential();
                    if (!(credential instanceof CustomCredential)
                        || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                        call.reject("O Google não retornou uma credencial de acesso válida.");
                        return;
                    }

                    try {
                        GoogleIdTokenCredential googleCredential = GoogleIdTokenCredential.createFrom(credential.getData());
                        JSObject response = new JSObject();
                        response.put("credential", googleCredential.getIdToken());
                        call.resolve(response);
                    } catch (Exception error) {
                        call.reject("Não foi possível ler a credencial do Google.", error);
                    }
                }

                @Override
                public void onError(GetCredentialException error) {
                    call.reject("Não foi possível concluir o acesso pelo Google.", error);
                }
            }
        );
    }
}
