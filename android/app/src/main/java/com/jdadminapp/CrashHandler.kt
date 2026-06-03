package com.jdadminapp

import android.content.Context
import android.content.Intent

object CrashHandler {
    private const val PREF = "jd_crash"
    private const val KEY  = "last_crash"

    fun install(context: Context) {
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                val trace = buildString {
                    append("Thread: ${thread.name}\n\n")
                    append("Exception: ${throwable.javaClass.name}\n")
                    append("Message: ${throwable.message}\n\n")
                    append("Stack trace:\n")
                    append(throwable.stackTraceToString())
                    throwable.cause?.let {
                        append("\n\nCaused by: ${it.javaClass.name}\n")
                        append(it.stackTraceToString())
                    }
                }
                context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
                    .edit().putString(KEY, trace).apply()
            } catch (_: Throwable) {}
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    fun getLastCrash(context: Context): String? =
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(KEY, null)

    fun clearLastCrash(context: Context) =
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().remove(KEY).apply()
}
