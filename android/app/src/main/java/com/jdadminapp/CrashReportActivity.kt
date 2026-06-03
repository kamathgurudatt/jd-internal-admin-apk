package com.jdadminapp

import android.app.Activity
import android.app.ActivityManager
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.widget.*

class CrashReportActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Try Java crash log first
        var crashLog = CrashHandler.getLastCrash(this)

        // On Android 11+ (API 30), also check native crash / ANR reason
        if (Build.VERSION.SDK_INT >= 30 && crashLog == null) {
            try {
                val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                val reasons = am.getHistoricalProcessExitReasons(packageName, 0, 5)
                if (reasons.isNotEmpty()) {
                    val last = reasons[0]
                    crashLog = buildString {
                        append("=== NATIVE CRASH DETECTED ===\n\n")
                        append("Android exit reason: ${last.reason}\n")
                        append("Description: ${last.description ?: "none"}\n")
                        append("Exit status: ${last.status}\n\n")
                        append("Reason codes:\n")
                        append("  1=CRASH  2=ANR  3=KILL  4=OTHER  6=SIGNALED  9=DEPENDENCY_DIED\n\n")
                        append("Device: ${Build.MANUFACTURER} ${Build.MODEL}\n")
                        append("Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})\n")
                        append("ABI: ${Build.SUPPORTED_ABIS.joinToString()}\n")
                    }
                }
            } catch (e: Throwable) {
                crashLog = "Could not read exit reasons: ${e.message}\n\n" +
                    "Device: ${Build.MANUFACTURER} ${Build.MODEL}\n" +
                    "Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})\n" +
                    "ABI: ${Build.SUPPORTED_ABIS.joinToString()}"
            }
        }

        // Always show device info even if no crash log
        if (crashLog == null) {
            crashLog = buildString {
                append("No crash log captured yet.\n\n")
                append("Device: ${Build.MANUFACTURER} ${Build.MODEL}\n")
                append("Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})\n")
                append("ABI: ${Build.SUPPORTED_ABIS.joinToString()}\n\n")
                append("The crash may be a native signal (SIGSEGV/SIGABRT)\n")
                append("that happens before Java code runs.\n")
                append("Share this screen with the developer.")
            }
        } else {
            // Append device info to any crash log
            crashLog += "\n\n=== DEVICE INFO ===\n" +
                "Device: ${Build.MANUFACTURER} ${Build.MODEL}\n" +
                "Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})\n" +
                "ABI: ${Build.SUPPORTED_ABIS.joinToString()}"
        }

        buildUI(crashLog)
    }

    private fun buildUI(crashLog: String) {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#05060a"))
            setPadding(0, 60, 0, 20)
        }

        root.addView(TextView(this).apply {
            text = "⚠ JD Admin — Crash Info"
            textSize = 18f
            setTextColor(Color.parseColor("#ef4444"))
            typeface = Typeface.DEFAULT_BOLD
            gravity = android.view.Gravity.CENTER
            setPadding(24, 0, 24, 4)
        })

        root.addView(TextView(this).apply {
            text = "Screenshot this entire screen and share with developer"
            textSize = 12f
            setTextColor(Color.parseColor("#f59e0b"))
            gravity = android.view.Gravity.CENTER
            setPadding(24, 0, 24, 16)
        })

        val scroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f)
            setBackgroundColor(Color.parseColor("#0d0f18"))
        }
        scroll.addView(TextView(this).apply {
            text = crashLog
            textSize = 10f
            setTextColor(Color.parseColor("#eef0f8"))
            typeface = Typeface.MONOSPACE
            setTextIsSelectable(true)
            setPadding(20, 20, 20, 20)
        })
        root.addView(scroll)

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            setPadding(24, 12, 24, 0)
        }
        btnRow.addView(Button(this).apply {
            text = "Clear & Try Again"
            setBackgroundColor(Color.parseColor("#FF6B00"))
            setTextColor(Color.WHITE)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT)
            setOnClickListener {
                CrashHandler.clearLastCrash(this@CrashReportActivity)
                startActivity(android.content.Intent(this@CrashReportActivity, MainActivity::class.java))
                finish()
            }
        })
        root.addView(btnRow)
        setContentView(root)
    }
}
