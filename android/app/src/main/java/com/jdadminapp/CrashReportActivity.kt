package com.jdadminapp

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*

/**
 * Pure Android Activity — no React Native.
 * Shows on launch if a previous crash was recorded.
 * Screenshot this and share with the developer.
 */
class CrashReportActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val crash = CrashHandler.getLastCrash(this) ?: run {
            // No crash — go straight to main app
            startMainActivity()
            return
        }

        // Build the crash report UI entirely in Kotlin (no XML needed)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#05060a"))
            setPadding(0, 60, 0, 20)
        }

        // Header
        root.addView(TextView(this).apply {
            text = "⚠ JD Admin — Crash Report"
            textSize = 18f
            setTextColor(Color.parseColor("#ef4444"))
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(24, 0, 24, 4)
        })

        root.addView(TextView(this).apply {
            text = "Screenshot this and share with developer"
            textSize = 12f
            setTextColor(Color.parseColor("#8892a8"))
            gravity = Gravity.CENTER
            setPadding(24, 0, 24, 20)
        })

        // Crash text in scrollable container
        val scroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
            )
            setBackgroundColor(Color.parseColor("#0d0f18"))
        }

        scroll.addView(TextView(this).apply {
            text = crash
            textSize = 10f
            setTextColor(Color.parseColor("#eef0f8"))
            typeface = Typeface.MONOSPACE
            setTextIsSelectable(true)
            setPadding(24, 24, 24, 24)
        })
        root.addView(scroll)

        // Buttons row
        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(24, 16, 24, 0)
        }

        // Clear & retry button
        btnRow.addView(Button(this).apply {
            text = "Clear & Try Again"
            setBackgroundColor(Color.parseColor("#FF6B00"))
            setTextColor(Color.WHITE)
            layoutParams = LinearLayout.LayoutParams(0,
                LinearLayout.LayoutParams.WRAP_CONTENT, 1f).also { it.marginEnd = 8 }
            setOnClickListener {
                CrashHandler.clearLastCrash(this@CrashReportActivity)
                startMainActivity()
            }
        })

        root.addView(btnRow)
        setContentView(root)
    }

    private fun startMainActivity() {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
            ?.apply { addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP) }
        // Since THIS is the launcher, just start MainActivity directly
        startActivity(android.content.Intent(this, MainActivity::class.java))
        finish()
    }
}
