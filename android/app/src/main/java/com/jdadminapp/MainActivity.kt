package com.jdadminapp

import android.annotation.SuppressLint
import android.content.SharedPreferences
import android.graphics.Color
import android.os.Bundle
import android.webkit.*
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import java.net.HttpURLConnection
import java.net.URL

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
                javaScriptEnabled    = true
                domStorageEnabled    = true
                loadWithOverviewMode = true
                useWideViewPort      = true
                builtInZoomControls  = false
                displayZoomControls  = false
                @Suppress("DEPRECATION")
                savePassword = false
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            }
            webViewClient = object : WebViewClient() {

                // Intercept every GET request — adds Bearer token + ngrok bypass to all navigations
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    if (request.method.uppercase() != "GET") return null
                    return try {
                        val conn = URL(request.url.toString()).openConnection() as HttpURLConnection
                        conn.requestMethod = "GET"
                        conn.connectTimeout = 15_000
                        conn.readTimeout    = 30_000
                        conn.instanceFollowRedirects = true
                        // Copy original headers (skip Authorization so we control it)
                        request.requestHeaders.forEach { (k, v) ->
                            if (!k.equals("Authorization", ignoreCase = true)) {
                                conn.setRequestProperty(k, v)
                            }
                        }
                        if (token.isNotEmpty()) conn.setRequestProperty("Authorization", "Bearer $token")
                        conn.setRequestProperty("ngrok-skip-browser-warning", "1")
                        conn.connect()

                        val mime = conn.contentType
                            ?.split(";")?.firstOrNull()?.trim() ?: "text/html"
                        val charset = conn.contentType
                            ?.split(";")
                            ?.find { it.trim().startsWith("charset=", ignoreCase = true) }
                            ?.substringAfter("=")?.trim() ?: "utf-8"
                        val code = conn.responseCode
                        val stream = if (code < 400) conn.inputStream else conn.errorStream

                        WebResourceResponse(mime, charset, code,
                            if (code == 200) "OK" else "Error",
                            conn.headerFields
                                .filterKeys { it != null }
                                .mapValues { it.value.firstOrNull() ?: "" },
                            stream)
                    } catch (e: Exception) {
                        null // fall through to normal WebView handling
                    }
                }

                // JS injection for fetch/XHR API calls made inside the page
                override fun onPageFinished(view: WebView, url: String) {
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

        // Initial load — shouldInterceptRequest does NOT fire for this call, so send headers here too
        val initHeaders = mutableMapOf("ngrok-skip-browser-warning" to "1")
        if (token.isNotEmpty()) initHeaders["Authorization"] = "Bearer $token"
        webView.loadUrl(serverUrl, initHeaders)
    }

    @Suppress("OVERRIDE_DEPRECATION", "MissingSuperCall")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
