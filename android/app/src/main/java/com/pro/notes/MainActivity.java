package com.pro.notes;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        try {
            WebView webView = this.getBridge().getWebView();
            if (webView != null) {
                
                // INSTANT LOCK: Jab bhi back karo, lock folder ki password wali memory ko khaali kar do
                String memoryWiper = 
                    "try { " +
                    "   sessionStorage.clear(); " +
                    "   var keysToRemove = []; " +
                    "   for (var i = 0; i < localStorage.length; i++) { " +
                    "       var key = localStorage.key(i).toLowerCase(); " +
                    "       if (key.includes('lock') || key.includes('unlock') || key.includes('auth') || key.includes('pass') || key.includes('pin') || key.includes('secure') || key.includes('vault') || key.includes('access')) { " +
                    "           keysToRemove.push(localStorage.key(i)); " +
                    "       } " +
                    "   } " +
                    "   for (var j = 0; j < keysToRemove.length; j++) { " +
                    "       localStorage.removeItem(keysToRemove[j]); " +
                    "   } " +
                    "} catch(e) {}";
                webView.evaluateJavascript(memoryWiper, null);

                // NORMAL BACK BUTTON KA KAAM
                String jsCode = 
                    "try {" +
                    "   var h = document.querySelector('header, nav, [class*=\"header\"]');" +
                    "   var b = h ? h.querySelector('button, [role=\"button\"]') : document.querySelector('button');" +
                    "   if(b) b.click(); else window.history.back();" +
                    "} catch(e) { window.history.back(); }";
                        
                webView.evaluateJavascript(jsCode, null);
            }
        } catch (Exception e) {
            super.onBackPressed();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        try {
            WebView webView = this.getBridge().getWebView();
            if (webView != null) {
                String jsCode = 
                    "try {" +
                    "   var h = document.querySelector('header, nav, [class*=\"header\"]');" +
                    "   var b = h ? h.querySelector('button, [role=\"button\"]') : document.querySelector('button');" +
                    "   if(b) b.click();" +
                    "} catch(e) {}";
                        
                webView.evaluateJavascript(jsCode, null);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
