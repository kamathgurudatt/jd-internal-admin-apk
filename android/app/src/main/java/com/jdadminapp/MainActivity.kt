package com.jdadminapp

import android.annotation.SuppressLint
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
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
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: SharedPreferences
    private var serverUrl = ""
    private var token     = ""
    private var currentTab = 0

    // Tab 0 = native home, 1-3 = WebViews, 4 = native settings
    private val tabEmojis  = listOf("🏠", "⏱", "🔐", "📈", "⚙")
    private val tabLabels  = listOf("Home", "Cron", "Access", "Analytics", "Settings")
    private val webPaths   = mapOf(1 to "/mobile-cron.html",
                                   2 to "/mobile-access.html",
                                   3 to "/mobile-analytics.html")

    private val webViews   = arrayOfNulls<WebView>(5)
    private val tabViews   = arrayOfNulls<View>(5)

    private lateinit var contentFrame : FrameLayout
    private lateinit var tabLabelViews: List<TextView>
    private lateinit var tabIndicators: List<View>

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs     = getSharedPreferences("jd_prefs", MODE_PRIVATE)
        serverUrl = prefs.getString("server_url",   "http://172.29.137.139:8080") ?: ""
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
        checkForUpdate()
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

        addView(FrameLayout(this@MainActivity).apply {
            val s = 34.dp
            layoutParams = LinearLayout.LayoutParams(s, s)
            background = circle(ORANGE)
            addView(tv("JD", 13f, Color.WHITE, bold = true).apply {
                gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(s, s)
            })
        })
        addView(tv("JD Admin", 17f, Color.WHITE, bold = true).apply {
            setPadding(12.dp, 0, 0, 0)
            layoutParams = LinearLayout.LayoutParams(0, WC, 1f)
        })
    }

    // ── Bottom nav ────────────────────────────────────────────────────────────

    private fun bottomNav(): LinearLayout {
        val labels     = mutableListOf<TextView>()
        val indicators = mutableListOf<View>()

        val wrapper = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(SURFACE) }
        wrapper.addView(View(this).apply {
            setBackgroundColor(Color.parseColor("#1a1d2e"))
            layoutParams = LinearLayout.LayoutParams(MP, 1)
        })
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        wrapper.addView(row)
        // Spacer that fills the Android navigation bar height so tabs aren't hidden behind it
        wrapper.addView(View(this).apply {
            setBackgroundColor(SURFACE)
            layoutParams = LinearLayout.LayoutParams(MP, navBarHeight())
        })

        tabEmojis.forEachIndexed { i, emoji ->
            val ind = View(this@MainActivity).apply {
                setBackgroundColor(ORANGE)
                layoutParams = LinearLayout.LayoutParams(MP, 2.dp)
                visibility = View.INVISIBLE
            }
            val lbl = tv(tabLabels[i], 10f, DIM).apply { gravity = Gravity.CENTER }
            indicators.add(ind); labels.add(lbl)

            row.addView(LinearLayout(this@MainActivity).apply {
                orientation = LinearLayout.VERTICAL
                gravity     = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(0, 54.dp, 1f)
                addView(ind)
                addView(vGap(4))
                addView(tv(emoji, 21f, Color.WHITE).apply { gravity = Gravity.CENTER })
                addView(lbl)
                setOnClickListener { switchTab(i) }
            })
        }
        tabLabelViews = labels
        tabIndicators = indicators
        return wrapper
    }

    // ── Tab switching ─────────────────────────────────────────────────────────

    private fun switchTab(idx: Int) {
        tabLabelViews.forEachIndexed { i, lv ->
            lv.setTextColor(if (i == idx) ORANGE else DIM)
            tabIndicators[i].visibility = if (i == idx) View.VISIBLE else View.INVISIBLE
        }
        tabViews[currentTab]?.visibility = View.GONE

        if (tabViews[idx] == null) {
            val v: View = when (idx) {
                0    -> homeView()
                4    -> settingsView()
                else -> makeWebView(webPaths[idx] ?: "/")
            }
            contentFrame.addView(v, FrameLayout.LayoutParams(MP, MP))
            tabViews[idx] = v
            if (idx in 1..3) webViews[idx] = v as WebView
        }
        tabViews[idx]!!.visibility = View.VISIBLE
        currentTab = idx
    }

    private fun reloadWebTabs() {
        for (i in 1..3) {
            webViews[i]?.let { contentFrame.removeView(it) }
            webViews[i] = null; tabViews[i] = null
        }
    }

    // ── Native Home dashboard ─────────────────────────────────────────────────

    private fun homeView(): ScrollView {
        val scroll = ScrollView(this).apply { setBackgroundColor(BG) }
        val root   = col().apply { setPadding(20.dp, 24.dp, 20.dp, 32.dp) }
        scroll.addView(root)

        // Welcome card
        root.addView(card().apply {
            setPadding(20.dp, 18.dp, 20.dp, 18.dp)
            addView(tv("Welcome back 👋", 13f, DIM))
            addView(vGap(4))
            addView(tv("Gurudatt Kamath", 20f, Color.WHITE, bold = true))
            addView(vGap(6))
            addView(LinearLayout(this@MainActivity).apply {
                orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
                addView(badge("⚙  Admin", ORANGE, Color.parseColor("#3a1800")))
                addView(vGap(0).apply { layoutParams = LinearLayout.LayoutParams(8.dp, 1) })
                addView(badge("Emp 10101221", Color.parseColor("#8a91a8"), SURFACE))
            })
        })

        root.addView(vGap(20))

        // Section label
        root.addView(tv("TOOLS", 11f, DIM, bold = true).apply { letterSpacing = 0.15f })
        root.addView(vGap(10))

        // 2×2 tool grid
        val tools = listOf(
            Triple("📊", "QC Dashboard",     1),
            Triple("🔐", "Access Control",    2),
            Triple("📈", "Analytics",         3),
            Triple("🌐", "Full Portal",        -1)
        )

        var row: LinearLayout? = null
        tools.forEachIndexed { idx, (emoji, name, tabIdx) ->
            if (idx % 2 == 0) {
                row = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = LinearLayout.LayoutParams(MP, WC).also { it.bottomMargin = 12.dp }
                }
                root.addView(row)
            }
            row!!.addView(toolCard(emoji, name) {
                if (tabIdx == -1) {
                    // Full portal — open main JD Tools page in Access tab slot
                    openPortal()
                } else {
                    switchTab(tabIdx)
                }
            }.apply {
                layoutParams = LinearLayout.LayoutParams(0, 110.dp, 1f).also {
                    if (idx % 2 == 0) it.rightMargin = 6.dp else it.leftMargin = 6.dp
                }
            })
        }

        root.addView(vGap(20))

        // Connection status
        root.addView(tv("CONNECTION", 11f, DIM, bold = true).apply { letterSpacing = 0.15f })
        root.addView(vGap(10))
        root.addView(card().apply {
            setPadding(16.dp, 14.dp, 16.dp, 14.dp)
            val isRemote = serverUrl.contains("ngrok") || serverUrl.contains("trycloudflare") ||
                serverUrl.contains(".dev") || serverUrl.contains(".app")
            addView(tv(if (isRemote) "🌐  Remote via tunnel" else "🏢  Office network",
                13f, Color.WHITE))
            addView(vGap(4))
            addView(tv(serverUrl, 11f, Color.parseColor("#3e4560")))
        })

        return scroll
    }

    private fun toolCard(emoji: String, name: String, onClick: () -> Unit): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            setBackgroundColor(SURFACE)
            background = GradientDrawable().apply {
                setColor(SURFACE); cornerRadius = 12.dp.toFloat()
            }
            addView(tv(emoji, 28f, Color.WHITE).apply { gravity = Gravity.CENTER })
            addView(vGap(8))
            addView(tv(name, 12f, Color.WHITE).apply {
                gravity = Gravity.CENTER; typeface = Typeface.DEFAULT_BOLD
            })
            setOnClickListener { onClick() }
        }
    }

    private fun openPortal() {
        // Load portal in a temporary overlay WebView inside tab 0 slot
        val wv = makeWebView("/")
        val back = tv("← Back", 13f, ORANGE).apply {
            setPadding(16.dp, 10.dp, 16.dp, 10.dp)
            setBackgroundColor(SURFACE)
            setOnClickListener {
                (parent as? FrameLayout)?.let { fr ->
                    fr.removeView(this)
                    fr.removeView(wv)
                }
            }
        }
        contentFrame.addView(wv, FrameLayout.LayoutParams(MP, MP).also { it.topMargin = 38.dp })
        contentFrame.addView(back, FrameLayout.LayoutParams(MP, WC))
    }

    // ── WebView factory ───────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun makeWebView(path: String): WebView = WebView(this).apply {
        setBackgroundColor(BG)
        settings.apply {
            javaScriptEnabled    = true
            domStorageEnabled    = true
            useWideViewPort      = false
            loadWithOverviewMode = false
            builtInZoomControls  = true
            displayZoomControls  = false
            mixedContentMode     = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            @Suppress("DEPRECATION") savePassword = false
        }
        webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, req: WebResourceRequest): WebResourceResponse? {
                if (req.method.uppercase() != "GET") return null
                return try {
                    val conn = URL(req.url.toString()).openConnection() as HttpURLConnection
                    conn.requestMethod = "GET"; conn.connectTimeout = 15_000; conn.readTimeout = 30_000
                    conn.instanceFollowRedirects = true
                    req.requestHeaders.forEach { (k, v) ->
                        if (!k.equals("Authorization", ignoreCase = true)) conn.setRequestProperty(k, v)
                    }
                    if (token.isNotEmpty()) conn.setRequestProperty("Authorization", "Bearer $token")
                    conn.setRequestProperty("ngrok-skip-browser-warning", "1")
                    conn.connect()
                    val mime    = conn.contentType?.split(";")?.first()?.trim() ?: "text/html"
                    val charset = conn.contentType?.split(";")
                        ?.firstOrNull { it.trim().startsWith("charset=", true) }
                        ?.substringAfter("=")?.trim() ?: "utf-8"
                    val code = conn.responseCode
                    WebResourceResponse(mime, charset, code, if (code == 200) "OK" else "Err",
                        conn.headerFields.filterKeys { it != null }.mapValues { it.value.firstOrNull() ?: "" },
                        if (code < 400) conn.inputStream else conn.errorStream)
                } catch (e: Exception) { null }
            }
            override fun onPageFinished(view: WebView, url: String) {
                // Force mobile viewport so pages render at device width
                view.evaluateJavascript("""
                    (function(){
                      var m=document.querySelector('meta[name=viewport]');
                      if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);}
                      m.content='width=device-width,initial-scale=1.0,maximum-scale=5.0,user-scalable=yes';
                    })();
                """.trimIndent(), null)

                val t = token.replace("\\", "\\\\").replace("'", "\\'")
                view.evaluateJavascript("""
                    (function(){if(window.__jdA)return;window.__jdA=true;var T='$t';
                    var oF=window.fetch.bind(window);
                    window.fetch=function(u,o){o=o||{};var h=new Headers(o.headers||{});
                    if(T&&!h.has('Authorization'))h.set('Authorization','Bearer '+T);
                    h.set('ngrok-skip-browser-warning','1');o.headers=h;return oF(u,o);};
                    var oS=XMLHttpRequest.prototype.send;
                    XMLHttpRequest.prototype.send=function(b){
                    try{if(T)this.setRequestHeader('Authorization','Bearer '+T);}catch(e){}
                    try{this.setRequestHeader('ngrok-skip-browser-warning','1');}catch(e){}
                    oS.apply(this,arguments);};})();
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

        root.addView(chip("🌐  Server URL"))
        val urlField = field(serverUrl)
        root.addView(urlField); root.addView(vGap(8))
        root.addView(btn("Save URL") {
            val v = urlField.text.toString().trim(); if (v.isEmpty()) return@btn
            prefs.edit().putString("server_url", v).apply(); serverUrl = v
            reloadWebTabs(); switchTab(0); toast("URL updated")
        })

        root.addView(divider())

        root.addView(chip("🔑  Bearer Token"))
        val tokField = field("", password = true).apply { hint = "Leave blank to keep current" }
        root.addView(tokField); root.addView(vGap(8))
        root.addView(btn("Save Token") {
            val v = tokField.text.toString().trim(); if (v.isEmpty()) return@btn
            prefs.edit().putString("bearer_token", v).apply(); token = v
            reloadWebTabs(); switchTab(0); toast("Token updated")
        })

        root.addView(divider())

        root.addView(chip("🔒  PIN"))
        root.addView(vGap(8))
        root.addView(btn("Change PIN", outline = true) { showChangePinDialog() })

        root.addView(divider())

        root.addView(chip("📡  Connection"))
        root.addView(vGap(6))
        val isRemote = serverUrl.contains("ngrok") || serverUrl.contains("trycloudflare") ||
            serverUrl.contains(".dev") || serverUrl.contains(".app")
        root.addView(tv(if (isRemote) "🌐  Remote (via tunnel)" else "🏢  Office network", 13f, Color.parseColor("#8a91a8")))
        root.addView(vGap(2))
        root.addView(tv(serverUrl, 11f, Color.parseColor("#3e4560")))

        root.addView(divider())

        root.addView(btn("Log out", danger = true) {
            AlertDialog.Builder(this)
                .setTitle("Log out?")
                .setMessage("Clears the PIN. You will need to re-enter credentials.")
                .setPositiveButton("Log out") { _, _ ->
                    prefs.edit().remove("pin_hash").apply()
                    startActivity(Intent(this, PinActivity::class.java)); finish()
                }
                .setNegativeButton("Cancel", null).show()
        })
        return scroll
    }

    private fun showChangePinDialog() {
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 24, 48, 8) }
        val p1 = EditText(this).apply { hint = "New PIN (4 digits)"; inputType = InputType.TYPE_CLASS_NUMBER; filters = arrayOf(android.text.InputFilter.LengthFilter(4)) }
        val p2 = EditText(this).apply { hint = "Confirm PIN"; inputType = InputType.TYPE_CLASS_NUMBER; filters = arrayOf(android.text.InputFilter.LengthFilter(4)) }
        layout.addView(p1); layout.addView(vGap(8)); layout.addView(p2)
        AlertDialog.Builder(this).setTitle("Change PIN").setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val a = p1.text.toString(); val b = p2.text.toString()
                when { a.length != 4 -> toast("PIN must be 4 digits"); a != b -> toast("PINs don't match")
                    else -> { prefs.edit().putString("pin_hash", sha256(a)).apply(); toast("PIN updated") } }
            }.setNegativeButton("Cancel", null).show()
    }

    // ── Update checker ────────────────────────────────────────────────────────

    private fun checkForUpdate() {
        thread(isDaemon = true) {
            try {
                val conn = URL("$serverUrl/apk-version").openConnection() as HttpURLConnection
                conn.connectTimeout = 6_000; conn.readTimeout = 6_000
                if (token.isNotEmpty()) conn.setRequestProperty("Authorization", "Bearer $token")
                conn.setRequestProperty("ngrok-skip-browser-warning", "1")
                conn.connect()
                if (conn.responseCode != 200) return@thread
                val remote    = conn.inputStream.bufferedReader().readText().trim()
                val installed = getString(R.string.build_date)  // stamped by CI at build time
                val dismissed = prefs.getString("last_seen_update_v2", "") ?: ""
                // Show only if server has a newer build than what's installed,
                // and user hasn't already dismissed this specific version
                if (remote.isNotEmpty() && remote != installed && remote != dismissed) {
                    runOnUiThread { showUpdateDialog(remote) }
                }
            } catch (_: Exception) {}
        }
    }

    private fun showUpdateDialog(remoteDate: String) {
        // Save immediately so it won't re-prompt even if user ignores
        prefs.edit().putString("last_seen_update_v2", remoteDate).apply()
        AlertDialog.Builder(this)
            .setTitle("Update Available")
            .setMessage("A new build is ready ($remoteDate). Download now?")
            .setPositiveButton("Download") { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("$serverUrl/apk")))
            }
            .setNegativeButton("Later", null)
            .show()
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private fun card() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        layoutParams = LinearLayout.LayoutParams(MP, WC).also { it.bottomMargin = 0 }
        background = GradientDrawable().apply { setColor(SURFACE); cornerRadius = 12.dp.toFloat() }
    }

    private fun badge(text: String, textColor: Int, bgColor: Int) = TextView(this).apply {
        this.text = text; textSize = 11f; setTextColor(textColor); typeface = Typeface.DEFAULT_BOLD
        setBackgroundColor(bgColor); setPadding(8.dp, 3.dp, 8.dp, 3.dp)
    }

    private fun col() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL; layoutParams = LinearLayout.LayoutParams(MP, WC)
    }

    private fun tv(text: String, size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
        this.text = text; textSize = size; setTextColor(color)
        if (bold) typeface = Typeface.DEFAULT_BOLD
    }

    private fun chip(text: String) = TextView(this).apply {
        this.text = text; textSize = 11f; setTextColor(ORANGE); typeface = Typeface.DEFAULT_BOLD; letterSpacing = 0.05f
    }

    private fun field(default: String, password: Boolean = false) = EditText(this).apply {
        setText(default); textSize = 13f; setTextColor(Color.WHITE)
        setHintTextColor(Color.parseColor("#3e4560")); setBackgroundColor(Color.parseColor("#0d0f18"))
        setPadding(12.dp, 10.dp, 12.dp, 10.dp)
        if (password) inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        layoutParams = LinearLayout.LayoutParams(MP, WC).also { it.topMargin = 6.dp }
    }

    private fun btn(label: String, outline: Boolean = false, danger: Boolean = false, onClick: () -> Unit) =
        TextView(this).apply {
            text = label; textSize = 13f; typeface = Typeface.DEFAULT_BOLD; gravity = Gravity.CENTER
            setPadding(0, 11.dp, 0, 11.dp); layoutParams = LinearLayout.LayoutParams(MP, WC)
            when {
                danger  -> { setTextColor(Color.parseColor("#ef4444")); setBackgroundColor(Color.parseColor("#1a0808")) }
                outline -> { setTextColor(ORANGE); setBackgroundColor(Color.parseColor("#1a1208")) }
                else    -> { setTextColor(Color.WHITE); setBackgroundColor(ORANGE) }
            }
            setOnClickListener { onClick() }
        }

    private fun divider() = View(this).apply {
        setBackgroundColor(Color.parseColor("#1a1d2e"))
        layoutParams = LinearLayout.LayoutParams(MP, 1).also { it.topMargin = 20.dp; it.bottomMargin = 20.dp }
    }

    private fun vGap(dp: Int) = View(this).apply { layoutParams = LinearLayout.LayoutParams(MP, dp.dp) }
    private fun circle(color: Int) = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(color) }
    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    private fun sha256(s: String) = MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }
    private fun statusBarPad(): Int { val id = resources.getIdentifier("status_bar_height", "dimen", "android"); return if (id > 0) resources.getDimensionPixelSize(id) else 0 }
    private fun navBarHeight(): Int { val id = resources.getIdentifier("navigation_bar_height", "dimen", "android"); return if (id > 0) resources.getDimensionPixelSize(id) else 0 }

    private val BG     = Color.parseColor("#05060a")
    private val SURFACE = Color.parseColor("#0d0f18")
    private val ORANGE  = Color.parseColor("#FF6B00")
    private val DIM     = Color.parseColor("#8a91a8")
    private val MP      = LinearLayout.LayoutParams.MATCH_PARENT
    private val WC      = LinearLayout.LayoutParams.WRAP_CONTENT
    private val Int.dp  get() = (this * resources.displayMetrics.density + 0.5f).toInt()
}
