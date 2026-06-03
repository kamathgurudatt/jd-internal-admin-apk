package com.jdadminapp

import android.annotation.SuppressLint
import android.content.SharedPreferences
import android.graphics.Color
import android.os.Bundle
import android.webkit.*
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("jd_prefs", MODE_PRIVATE)

        val serverUrl = prefs.getString("server_url", "http://172.29.137.139:8080")
            ?: "http://172.29.137.139:8080"
        val token = prefs.getString("bearer_token", "") ?: ""

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
                    // Inject Bearer token + ngrok bypass into every fetch() and XHR call
                    val t = token.replace("\\", "\\\\").replace("'", "\\'")
                    view.evaluateJavascript("""
                        (function(){
                          if(window.__jdA)return;window.__jdA=true;
                          var T='$t';
                          var oF=window.fetch.bind(window);
                          window.fetch=function(u,o){
                            o=o||{};var h=new Headers(o.headers||{});
                            if(T&&!h.has('Authorization'))h.set('Authorization','Bearer '+T);
                            h.set('ngrok-skip-browser-warning','1');
                            o.headers=h;return oF(u,o);
                          };
                          var oS=XMLHttpRequest.prototype.send;
                          XMLHttpRequest.prototype.send=function(b){
                            try{if(T)this.setRequestHeader('Authorization','Bearer '+T);}catch(e){}
                            try{this.setRequestHeader('ngrok-skip-browser-warning','1');}catch(e){}
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

        // First page load — send both auth + ngrok bypass headers
        val initHeaders = mutableMapOf("ngrok-skip-browser-warning" to "1")
        if (token.isNotEmpty()) initHeaders["Authorization"] = "Bearer $token"
        webView.loadUrl(serverUrl, initHeaders)
    }

    @Suppress("OVERRIDE_DEPRECATION", "MissingSuperCall")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
