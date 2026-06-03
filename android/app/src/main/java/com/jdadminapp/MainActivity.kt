package com.jdadminapp

import android.annotation.SuppressLint
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.webkit.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: SharedPreferences
    private var serverUrl = ""
    private var token = ""
    private var currentTab = 0

    private val tabEmojis  = listOf("🏠", "📊", "🔐", "📈", "⚙")
    private val tabLabels  = listOf("Home", "QC", "Access", "Analytics", "Settings")
    private val tabPaths   = listOf("/", "/ai_qc_dashboard.html", "/admin-access.html", "/analytics-dashboard.html", null)

    private val webViews   = arrayOfNulls<WebView>(4)
    private val tabViews   = arrayOfNulls<View>(5)

    private lateinit var contentFrame : FrameLayout
    private lateinit var tabEmojiViews: List<TextView>
    private lateinit var tabLabelViews: List<TextView>
    private lateinit var tabIndicators: List<View>

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs     = getSharedPreferences("jd_prefs", MODE_PRIVATE)
        serverUrl = prefs.getString("server_url",  "http://172.29.137.139:8080") ?: "http://172.29.137.139:8080"
        token     = prefs.getString("bearer_token", "") ?: ""

        window.statusBarColor = Color.parseColor("#0d0f18")

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(BG)
            layoutParams = LinearLayout.LayoutParams(MP, MP)
        }
        setContentView(root)

        root.addView(topBar())

        contentFrame = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(MP, 0, 1f)
            setBackgroundColor(BG)
        }
        root.addView(contentFrame)
        root.addView(bottomNav())

        switchTab(0)
    }

    @Suppress("OVERRIDE_DEPRECATION", "MissingSuperCall")
    override fun onBackPressed() {
        val wv = webViews.getOrNull(currentTab)
        if (wv != null && wv.canGoBack()) wv.goBack() else super.onBackPressed()
    }

    // ── Top bar ───────────────────────────────────────────────────────────────

    private fun topBar() = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity     = Gravity.CENTER_VERTICAL
        setBackgroundColor(SURFACE)
        setPadding(18.dp, statusBarPad() + 10.dp, 18.dp, 10.dp)

        // JD badge
        addView(FrameLayout(this@MainActivity).apply {
            val s = 34.dp
            layoutParams = LinearLayout.LayoutParams(s, s)
            background = circle(ORANGE)
            addView(tv("JD", 13f, Color.WHITE, bold = true).apply {
                gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(s, s)
            })
        })

        // App name
        addView(tv("JD Admin", 17f, Color.WHITE, bold = true).apply {
            setPadding(12.dp, 0, 0, 0)
            layoutParams = LinearLayout.LayoutParams(0, WC, 1f)
        })
    }

    // ── Bottom nav ────────────────────────────────────────────────────────────

    private fun bottomNav(): LinearLayout {
        val emojis     = mutableListOf<TextView>()
        val labels     = mutableListOf<TextView>()
        val indicators = mutableListOf<View>()

        val row = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(SURFACE)
        }
        // Top border
        row.addView(View(this).apply {
            setBackgroundColor(Color.parseColor("#1a1d2e"))
            layoutParams = LinearLayout.LayoutParams(MP, 1)
        })

        val tabs = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(tabs)

        tabEmojis.forEachIndexed { i, emoji ->
            val indicator = View(this@MainActivity).apply {
                setBackgroundColor(ORANGE)
                layoutParams = LinearLayout.LayoutParams(MP, 2.dp)
                visibility = View.INVISIBLE
            }
            val emojiTv = tv(emoji, 21f, Color.WHITE)
            val labelTv = tv(tabLabels[i], 10f, DIM).apply { gravity = Gravity.CENTER }

            indicators.add(indicator)
            emojis.add(emojiTv)
            labels.add(labelTv)

            tabs.addView(LinearLayout(this@MainActivity).apply {
                orientation = LinearLayout.VERTICAL
                gravity     = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(0, 54.dp, 1f)
                addView(indicator)
                addView(vGap(4))
                addView(emojiTv)
                addView(labelTv)
                setOnClickListener { switchTab(i) }
            })
        }

        tabEmojiViews  = emojis
        tabLabelViews  = labels
        tabIndicators  = indicators
        return row
    }

    // ── Tab switching ─────────────────────────────────────────────────────────

    private fun switchTab(idx: Int) {
        // Update nav highlight
        tabLabelViews.forEachIndexed { i, lv ->
            val sel = i == idx
            lv.setTextColor(if (sel) ORANGE else DIM)
            tabIndicators[i].visibility = if (sel) View.VISIBLE else View.INVISIBLE
        }

        // Hide current, show/create new
        tabViews[currentTab]?.visibility = View.GONE

        if (tabViews[idx] == null) {
            val v = if (idx == 4) settingsView() else makeWebView(tabPaths[idx] ?: "/")
            contentFrame.addView(v, FrameLayout.LayoutParams(MP, MP))
            tabViews[idx] = v
            if (idx < 4) webViews[idx] = v as WebView
        }
        tabViews[idx]!!.visibility = View.VISIBLE
        currentTab = idx
    }

    private fun reloadAllWebTabs() {
        for (i in 0..3) {
            webViews[i]?.let { contentFrame.removeView(it) }
            webViews[i]  = null
            tabViews[i]  = null
        }
    }

    // ── WebView factory ───────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun makeWebView(path: String): WebView = WebView(this).apply {
        setBackgroundColor(BG)
        settings.apply {
            javaScriptEnabled    = true
            domStorageEnabled    = true
            loadWithOverviewMode = true
            useWideViewPort      = true
            builtInZoomControls  = false
            displayZoomControls  = false
            mixedContentMode     = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            @Suppress("DEPRECATION") savePassword = false
        }
        webViewClient = object : WebViewClient() {

            // Inject auth + ngrok header on every GET (covers link clicks, navigations)
            override fun shouldInterceptRequest(
                view: WebView, request: WebResourceRequest
            ): WebResourceResponse? {
                if (request.method.uppercase() != "GET") return null
                return try {
                    val conn = URL(request.url.toString()).openConnection() as HttpURLConnection
                    conn.requestMethod = "GET"
                    conn.connectTimeout = 15_000
                    conn.readTimeout    = 30_000
                    conn.instanceFollowRedirects = true
                    request.requestHeaders.forEach { (k, v) ->
                        if (!k.equals("Authorization", ignoreCase = true)) conn.setRequestProperty(k, v)
                    }
                    if (token.isNotEmpty()) conn.setRequestProperty("Authorization", "Bearer $token")
                    conn.setRequestProperty("ngrok-skip-browser-warning", "1")
                    conn.connect()
                    val mime    = conn.contentType?.split(";")?.first()?.trim() ?: "text/html"
                    val charset = conn.contentType?.split(";")
                        ?.firstOrNull { it.trim().startsWith("charset=", true) }
                        ?.substringAfter("=")?.trim() ?: "utf-8"
                    val code    = conn.responseCode
                    WebResourceResponse(mime, charset, code,
                        if (code == 200) "OK" else "Err",
                        conn.headerFields.filterKeys { it != null }.mapValues { it.value.firstOrNull() ?: "" },
                        if (code < 400) conn.inputStream else conn.errorStream)
                } catch (e: Exception) { null }
            }

            // Patch fetch / XHR for in-page API calls
            override fun onPageFinished(view: WebView, url: String) {
                val t = token.replace("\\", "\\\\").replace("'", "\\'")
                view.evaluateJavascript("""
                    (function(){
                      if(window.__jdA)return;window.__jdA=true;var T='$t';
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
        val hdrs = mutableMapOf("ngrok-skip-browser-warning" to "1")
        if (token.isNotEmpty()) hdrs["Authorization"] = "Bearer $token"
        loadUrl("$serverUrl$path", hdrs)
    }

    // ── Settings view ─────────────────────────────────────────────────────────

    private fun settingsView(): ScrollView {
        val scroll = ScrollView(this).apply { setBackgroundColor(BG) }
        val root   = col().apply { setPadding(24.dp, 24.dp, 24.dp, 40.dp) }
        scroll.addView(root)

        root.addView(tv("Settings", 22f, Color.WHITE, bold = true))
        root.addView(vGap(24))

        // ── Server URL ────────────────────────────────────────────────────────
        root.addView(chip("🌐  Server URL"))
        val urlField = field(serverUrl)
        root.addView(urlField)
        root.addView(vGap(8))
        root.addView(btn("Save URL") {
            val v = urlField.text.toString().trim()
            if (v.isEmpty()) return@btn
            prefs.edit().putString("server_url", v).apply()
            serverUrl = v
            reloadAllWebTabs()
            switchTab(0)
            toast("URL updated — reloading tabs")
        })

        root.addView(divider())

        // ── Bearer token ──────────────────────────────────────────────────────
        root.addView(chip("🔑  Bearer Token"))
        val tokField = field("", password = true).apply { hint = "Leave blank to keep current" }
        root.addView(tokField)
        root.addView(vGap(8))
        root.addView(btn("Save Token") {
            val v = tokField.text.toString().trim()
            if (v.isEmpty()) return@btn
            prefs.edit().putString("bearer_token", v).apply()
            token = v
            reloadAllWebTabs()
            switchTab(0)
            toast("Token updated")
        })

        root.addView(divider())

        // ── PIN ───────────────────────────────────────────────────────────────
        root.addView(chip("🔒  PIN"))
        root.addView(vGap(8))
        root.addView(btn("Change PIN", outline = true) { showChangePinDialog() })

        root.addView(divider())

        // ── Connection info ───────────────────────────────────────────────────
        root.addView(chip("📡  Connection"))
        root.addView(vGap(6))
        val connType = if (serverUrl.contains("ngrok") || serverUrl.contains("trycloudflare") ||
            serverUrl.contains(".dev") || serverUrl.contains(".app"))
            "Remote  (via tunnel)" else "Office network"
        root.addView(tv(connType, 13f, Color.parseColor("#8a91a8")))
        root.addView(vGap(2))
        root.addView(tv(serverUrl, 11f, Color.parseColor("#3e4560")))

        root.addView(divider())

        // ── Logout ────────────────────────────────────────────────────────────
        root.addView(btn("Log out", danger = true) {
            AlertDialog.Builder(this)
                .setTitle("Log out?")
                .setMessage("This clears the PIN. You will need to re-enter your credentials.")
                .setPositiveButton("Log out") { _, _ ->
                    prefs.edit().remove("pin_hash").apply()
                    startActivity(Intent(this, PinActivity::class.java))
                    finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        })

        return scroll
    }

    private fun showChangePinDialog() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(48, 24, 48, 8)
        }
        val p1 = EditText(this).apply {
            hint = "New PIN (4 digits)"; inputType = InputType.TYPE_CLASS_NUMBER
            filters = arrayOf(android.text.InputFilter.LengthFilter(4))
        }
        val p2 = EditText(this).apply {
            hint = "Confirm PIN"; inputType = InputType.TYPE_CLASS_NUMBER
            filters = arrayOf(android.text.InputFilter.LengthFilter(4))
        }
        layout.addView(p1); layout.addView(vGap(8)); layout.addView(p2)

        AlertDialog.Builder(this)
            .setTitle("Change PIN")
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val a = p1.text.toString(); val b = p2.text.toString()
                when {
                    a.length != 4         -> toast("PIN must be 4 digits")
                    a != b                -> toast("PINs don't match")
                    else -> {
                        prefs.edit().putString("pin_hash", sha256(a)).apply()
                        toast("PIN updated")
                    }
                }
            }
            .setNegativeButton("Cancel", null).show()
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private fun col() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        layoutParams = LinearLayout.LayoutParams(MP, WC)
    }

    private fun tv(text: String, size: Float, color: Int, bold: Boolean = false) =
        TextView(this).apply {
            this.text = text; textSize = size; setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
        }

    private fun chip(text: String) = TextView(this).apply {
        this.text = text; textSize = 11f
        setTextColor(ORANGE); typeface = Typeface.DEFAULT_BOLD
        letterSpacing = 0.05f
    }

    private fun field(default: String, password: Boolean = false) = EditText(this).apply {
        setText(default); textSize = 13f; setTextColor(Color.WHITE)
        setHintTextColor(Color.parseColor("#3e4560"))
        setBackgroundColor(Color.parseColor("#0d0f18"))
        setPadding(12.dp, 10.dp, 12.dp, 10.dp)
        if (password) inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        layoutParams = LinearLayout.LayoutParams(MP, WC).also { it.topMargin = 6.dp }
    }

    private fun btn(label: String, outline: Boolean = false, danger: Boolean = false, onClick: () -> Unit) =
        TextView(this).apply {
            text = label; textSize = 13f; typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, 11.dp, 0, 11.dp)
            layoutParams = LinearLayout.LayoutParams(MP, WC)
            when {
                danger  -> { setTextColor(Color.parseColor("#ef4444")); setBackgroundColor(Color.parseColor("#1a0808")) }
                outline -> { setTextColor(ORANGE); setBackgroundColor(Color.parseColor("#1a1208")) }
                else    -> { setTextColor(Color.WHITE); setBackgroundColor(ORANGE) }
            }
            setOnClickListener { onClick() }
        }

    private fun divider() = View(this).apply {
        setBackgroundColor(Color.parseColor("#1a1d2e"))
        layoutParams = LinearLayout.LayoutParams(MP, 1).also {
            it.topMargin = 20.dp; it.bottomMargin = 20.dp
        }
    }

    private fun vGap(dp: Int) = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(MP, dp.dp)
    }

    private fun circle(color: Int) = GradientDrawable().apply {
        shape = GradientDrawable.OVAL; setColor(color)
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    private fun sha256(s: String) = MessageDigest.getInstance("SHA-256")
        .digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

    private fun statusBarPad(): Int {
        val id = resources.getIdentifier("status_bar_height", "dimen", "android")
        return if (id > 0) resources.getDimensionPixelSize(id) else 0
    }

    private val BG     = Color.parseColor("#05060a")
    private val SURFACE = Color.parseColor("#0d0f18")
    private val ORANGE  = Color.parseColor("#FF6B00")
    private val DIM     = Color.parseColor("#8a91a8")
    private val MP      = LinearLayout.LayoutParams.MATCH_PARENT
    private val WC      = LinearLayout.LayoutParams.WRAP_CONTENT
    private val Int.dp  get() = (this * resources.displayMetrics.density + 0.5f).toInt()
}
