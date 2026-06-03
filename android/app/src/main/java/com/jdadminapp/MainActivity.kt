package com.jdadminapp

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.webkit.*
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var prefs: android.content.SharedPreferences

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = openPrefs()

        val serverUrl = prefs.getString("server_url", "http://172.29.137.139:8080") ?: "http://172.29.137.139:8080"
        val token     = prefs.getString("bearer_token", "") ?: ""

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#05060a"))
            settings.apply {
                javaScriptEnabled   = true
                domStorageEnabled   = true
                loadWithOverviewMode = true
                useWideViewPort     = true
                builtInZoomControls = false
                displayZoomControls = false
                @Suppress("DEPRECATION")
                savePassword = false
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            }
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    if (token.isEmpty()) return
                    // Patch fetch/XHR to include Bearer token on every in-page API call
                    val t = token.replace("\\", "\\\\").replace("'", "\\'")
                    view.evaluateJavascript("""
                        (function(){
                          if(window.__jdA)return;window.__jdA=true;
                          var T='$t';
                          var oF=window.fetch.bind(window);
                          window.fetch=function(u,o){
                            o=o||{};var h=new Headers(o.headers||{});
                            if(!h.has('Authorization'))h.set('Authorization','Bearer '+T);
                            o.headers=h;return oF(u,o);
                          };
                          var oS=XMLHttpRequest.prototype.send;
                          XMLHttpRequest.prototype.send=function(b){
                            try{this.setRequestHeader('Authorization','Bearer '+T);}catch(e){}
                            oS.apply(this,arguments);
                          };
                        })();
                    """.trimIndent(), null)
                }
            }
        }

        setContentView(FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#05060a"))
            addView(webView, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT))
        })

        // First page load carries Authorization header; JS injection handles subsequent navigation
        if (token.isNotEmpty()) {
            webView.loadUrl(serverUrl, mapOf("Authorization" to "Bearer $token"))
        } else {
            webView.loadUrl(serverUrl)
        }
    }

    @Suppress("OVERRIDE_DEPRECATION", "MissingSuperCall")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    private fun openPrefs(): android.content.SharedPreferences = try {
        val mk = MasterKey.Builder(this).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
        EncryptedSharedPreferences.create(
            this, "jd_prefs", mk,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (_: Exception) {
        getSharedPreferences("jd_prefs", MODE_PRIVATE)
    }
}
