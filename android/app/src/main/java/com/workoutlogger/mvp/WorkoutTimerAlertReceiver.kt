package com.workoutlogger.mvp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class WorkoutTimerAlertReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == ACTION_STOP_TIMER_ALERT) {
      WorkoutTimerAlertService.stop(context)
      return
    }

    val mode = intent.getStringExtra(EXTRA_MODE) ?: MODE_VIBRATE
    if (mode == MODE_SILENT) {
      return
    }
    WorkoutTimerAlertService.start(
      context = context,
      mode = mode,
      soundUri = intent.getStringExtra(EXTRA_SOUND_URI),
      volume = intent.getDoubleExtra(EXTRA_VOLUME, 1.0),
    )
  }

  companion object {
    const val ACTION_TIMER_ALERT = "com.workoutlogger.mvp.TIMER_ALERT"
    const val ACTION_STOP_TIMER_ALERT = "com.workoutlogger.mvp.STOP_TIMER_ALERT"
    const val EXTRA_MODE = "mode"
    const val EXTRA_SOUND_URI = "soundUri"
    const val EXTRA_TIMER_ALERT = "timerAlert"
    const val EXTRA_VOLUME = "volume"

    private const val MODE_SILENT = "silent"
    private const val MODE_VIBRATE = "vibrate"
  }
}
