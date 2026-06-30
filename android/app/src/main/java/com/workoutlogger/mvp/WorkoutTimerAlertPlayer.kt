package com.workoutlogger.mvp

import android.content.Context
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build

object WorkoutTimerAlertPlayer {
  private var activeRingtone: Ringtone? = null

  fun play(context: Context, uri: String?, volume: Double) {
    val soundUri = uri?.let(Uri::parse) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    val ringtone = RingtoneManager.getRingtone(context, soundUri)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      ringtone?.volume = volume.coerceIn(0.0, 1.0).toFloat()
      ringtone?.isLooping = true
    }
    stop()
    activeRingtone = ringtone
    ringtone?.play()
  }

  fun stop() {
    activeRingtone?.stop()
    activeRingtone = null
  }
}
