package br.com.ritmesa.bisburger;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "FirebaseToken")
public class FirebaseTokenPlugin extends Plugin {

    @PluginMethod
    public void getToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    call.reject("Fetching FCM registration token failed", task.getException());
                    return;
                }
                String token = task.getResult();
                JSObject ret = new JSObject();
                ret.put("token", token);
                call.resolve(ret);
            });
    }
}
