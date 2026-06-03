package com.jdadminapp

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.MessageDigest

class PinActivity : AppCompatActivity() {

    private lateinit var prefs: android.content.SharedPreferences
    private var entered = ""
    private var pending = ""
    private var mode = "verify" // "setup" | "confirm" | "verify"

    private lateinit var statusText: TextView
    private lateinit var errorText: TextView
    private lateinit var dots: Array<View>
    private var urlEdit: EditText? = null
    private var tokenEdit: EditText? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = openPrefs()
        mode = if (!prefs.contains("pin_hash") || !prefs.contains("bearer_token")) "setup" else "verify"
        buildUI()
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

    private fun buildUI() {
        val scroll = ScrollView(this).apply { setBackgroundColor(bg) }
        val root = col(Gravity.CENTER_HORIZONTAL).apply { setPadding(0, 64.dp, 0, 32.dp) }
        scroll.addView(root)
        setContentView(scroll)

        // Logo
        root.addView(FrameLayout(this).apply {
            val s = 72.dp
            layoutParams = LinearLayout.LayoutParams(s, s).also { it.gravity = Gravity.CENTER_HORIZONTAL }
            background = oval(accent, 36.dp)
            addView(TextView(this@PinActivity).apply {
                text = "JD"; textSize = 28f; typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.WHITE); gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(s, s)
            })
        })

        root.addView(gap(14))
        root.addView(text("JD Admin", 21f, Color.WHITE, bold = true))
        root.addView(gap(4))

        statusText = text("", 13f, Color.parseColor("#8a91a8"))
        root.addView(statusText)
        root.addView(gap(20))

        if (mode == "setup") { root.addView(setupFields()); root.addView(gap(20)) }

        // PIN dots row
        val dotRow = LinearLayout(this).apply { gravity = Gravity.CENTER }
        dots = Array(4) {
            View(this@PinActivity).apply {
                val s = 14.dp
                layoutParams = LinearLayout.LayoutParams(s, s).also { p -> p.setMargins(10.dp, 0, 10.dp, 0) }
                background = oval(dimColor, 7.dp)
            }
        }
        dots.forEach { dotRow.addView(it) }
        root.addView(dotRow)
        root.addView(gap(8))

        errorText = text("", 12f, Color.parseColor("#ef4444"))
        root.addView(errorText)
        root.addView(gap(16))

        root.addView(numpad())
        updateStatus()
    }

    private fun setupFields(): LinearLayout {
        val c = col().apply { setPadding(40.dp, 0, 40.dp, 0) }
        c.addView(smallLabel("Server URL"))
        urlEdit = input(prefs.getString("server_url", "http://172.29.137.139:8080") ?: "")
        c.addView(urlEdit)
        c.addView(gap(10))
        c.addView(smallLabel("Bearer Token"))
        tokenEdit = input("", password = true).apply { hint = "jdadmin-..." }
        c.addView(tokenEdit)
        return c
    }

    private fun numpad(): GridLayout {
        val g = GridLayout(this).apply { columnCount = 3; setPadding(16.dp, 0, 16.dp, 0) }
        listOf("1","2","3","4","5","6","7","8","9","","0","⌫").forEach { k ->
            g.addView(TextView(this).apply {
                text = k; textSize = 24f; typeface = Typeface.DEFAULT_BOLD
                setTextColor(if (k.isEmpty()) Color.TRANSPARENT else Color.WHITE)
                gravity = Gravity.CENTER
                val s = 86.dp
                layoutParams = GridLayout.LayoutParams().apply {
                    width = s; height = s; setMargins(6.dp, 6.dp, 6.dp, 6.dp)
                }
                if (k.isNotEmpty()) {
                    setBackgroundColor(Color.parseColor("#0d0f18"))
                    setOnClickListener { onKey(k) }
                }
            })
        }
        return g
    }

    private fun onKey(k: String) {
        if (k == "⌫") { if (entered.isNotEmpty()) { entered = entered.dropLast(1); refresh() }; return }
        if (entered.length >= 4) return
        entered += k; refresh()
        if (entered.length == 4) complete()
    }

    private fun complete() {
        when (mode) {
            "setup" -> {
                val url = urlEdit?.text?.toString()?.trim() ?: ""
                val tok = tokenEdit?.text?.toString()?.trim() ?: ""
                if (url.isEmpty() || tok.isEmpty()) {
                    errorText.text = "Fill in server URL and bearer token first"
                    entered = ""; refresh(); return
                }
                prefs.edit().putString("server_url", url).putString("bearer_token", tok).apply()
                pending = entered; entered = ""; mode = "confirm"; refresh(); updateStatus()
            }
            "confirm" -> {
                if (entered == pending) {
                    prefs.edit().putString("pin_hash", sha256(entered)).apply()
                    go()
                } else {
                    errorText.text = "PINs don't match — try again"
                    entered = ""; pending = ""; mode = "setup"; refresh(); updateStatus()
                }
            }
            "verify" -> {
                if (sha256(entered) == prefs.getString("pin_hash", "")) go()
                else { errorText.text = "Wrong PIN"; entered = ""; refresh() }
            }
        }
    }

    private fun go() { startActivity(Intent(this, MainActivity::class.java)); finish() }

    private fun refresh() {
        errorText.text = ""
        dots.forEachIndexed { i, v -> v.background = oval(if (i < entered.length) accent else dimColor, 7.dp) }
    }

    private fun updateStatus() {
        statusText.text = when (mode) {
            "setup" -> "First launch — configure access"
            "confirm" -> "Confirm your PIN"
            else -> "Enter your PIN"
        }
        refresh()
    }

    private fun sha256(s: String) = MessageDigest.getInstance("SHA-256")
        .digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

    private fun oval(hex: String, r: Int) = GradientDrawable().apply {
        shape = GradientDrawable.OVAL; setColor(Color.parseColor(hex))
    }

    private fun col(gravity: Int = Gravity.NO_GRAVITY) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        if (gravity != Gravity.NO_GRAVITY) this.gravity = gravity
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    }

    private fun text(t: String, size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
        text = t; textSize = size; setTextColor(color); gravity = Gravity.CENTER
        if (bold) typeface = Typeface.DEFAULT_BOLD
    }

    private fun smallLabel(t: String) = TextView(this).apply {
        text = t; textSize = 12f; setTextColor(Color.parseColor("#8a91a8"))
    }

    private fun input(default: String, password: Boolean = false) = EditText(this).apply {
        setText(default); textSize = 13f; setTextColor(Color.WHITE)
        setHintTextColor(Color.parseColor("#3e4560"))
        setBackgroundColor(Color.parseColor("#0d0f18"))
        setPadding(12.dp, 10.dp, 12.dp, 10.dp)
        if (password) inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    }

    private fun gap(dp: Int) = android.view.View(this).apply {
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp.dp)
    }

    private val bg = Color.parseColor("#05060a")
    private val accent = "#FF6B00"
    private val dimColor = "#2a2d3e"
    private val Int.dp get() = (this * resources.displayMetrics.density + 0.5f).toInt()
}
