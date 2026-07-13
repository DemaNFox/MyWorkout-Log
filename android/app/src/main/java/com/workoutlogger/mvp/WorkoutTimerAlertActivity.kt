package com.workoutlogger.mvp

import android.app.Activity
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class WorkoutTimerAlertActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (intent.getBooleanExtra(WorkoutTimerAlertReceiver.EXTRA_TIMER_ALERT, false)) {
      WorkoutTimerAlertService.start(
        context = this,
        mode = intent.getStringExtra(WorkoutTimerAlertReceiver.EXTRA_MODE) ?: "vibrate",
        soundUri = intent.getStringExtra(WorkoutTimerAlertReceiver.EXTRA_SOUND_URI),
        volume = intent.getDoubleExtra(WorkoutTimerAlertReceiver.EXTRA_VOLUME, 1.0),
      )
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    setContentView(createAlertView())
  }

  @Deprecated("The timer alert must be stopped explicitly while it is ringing.")
  override fun onBackPressed() = Unit

  private fun createAlertView(): LinearLayout {
    val density = resources.displayMetrics.density
    val horizontalPadding = (24 * density).toInt()
    val verticalPadding = (20 * density).toInt()
    val cardBackground = GradientDrawable().apply {
      setColor(Color.WHITE)
      cornerRadius = 16 * density
    }

    return LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(horizontalPadding, verticalPadding, horizontalPadding, verticalPadding)
      background = cardBackground
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )

      addView(
        TextView(this@WorkoutTimerAlertActivity).apply {
          text = "Rest timer finished"
          textSize = 24f
          setTextColor(Color.rgb(24, 24, 27))
          gravity = Gravity.CENTER
        },
        LinearLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply {
          bottomMargin = (18 * density).toInt()
        },
      )

      addView(
        Button(this@WorkoutTimerAlertActivity).apply {
          text = "Stop alert"
          textSize = 18f
          minHeight = (56 * density).toInt()
          setOnClickListener {
            WorkoutTimerAlertService.stop(this@WorkoutTimerAlertActivity)
            finishAndRemoveTask()
          }
        },
        LinearLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
        ),
      )
    }
  }
}
