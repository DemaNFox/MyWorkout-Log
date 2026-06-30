package com.workoutlogger.mvp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class WorkoutTimerAlertService : Service() {
  private var mediaPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopAlert()
      return START_NOT_STICKY
    }

    val mode = intent?.getStringExtra(WorkoutTimerAlertReceiver.EXTRA_MODE) ?: MODE_VIBRATE
    val soundUri = intent?.getStringExtra(WorkoutTimerAlertReceiver.EXTRA_SOUND_URI)
    val volume = intent?.getDoubleExtra(WorkoutTimerAlertReceiver.EXTRA_VOLUME, 1.0) ?: 1.0
    startForeground(NOTIFICATION_ID, createNotification())
    startAlert(mode, soundUri, volume)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    releaseAlert()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createNotification(): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
      putExtra(WorkoutTimerAlertReceiver.EXTRA_TIMER_ALERT, true)
    }
    val contentIntent = PendingIntent.getActivity(
      this,
      REQUEST_OPEN_APP,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val stopIntent = Intent(this, WorkoutTimerAlertService::class.java).apply {
      action = ACTION_STOP
    }
    val stopPendingIntent = PendingIntent.getService(
      this,
      REQUEST_STOP_ALERT,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("Rest finished")
      .setContentText("Time for the next set.")
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(false)
      .setOngoing(true)
      .setSilent(true)
      .setContentIntent(contentIntent)
      .setFullScreenIntent(contentIntent, true)
      .addAction(R.mipmap.ic_launcher, "Stop timer", stopPendingIntent)
      .build()
  }

  private fun startAlert(mode: String, soundUri: String?, volume: Double) {
    releaseAlert()
    if (mode == MODE_SOUND || mode == MODE_SOUND_VIBRATE) {
      val player = MediaPlayer()
      runCatching {
        player.apply {
          setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ALARM)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
          setDataSource(
            this@WorkoutTimerAlertService,
            soundUri?.let(Uri::parse) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
          )
          isLooping = true
          val normalizedVolume = volume.coerceIn(0.0, 1.0).toFloat()
          setVolume(normalizedVolume, normalizedVolume)
          prepare()
          start()
        }
        mediaPlayer = player
      }.onFailure {
        player.release()
      }
    }
    if (mode == MODE_VIBRATE || mode == MODE_SOUND_VIBRATE) {
      vibrator = getSystemService(Vibrator::class.java)
      val pattern = longArrayOf(0L, 350L, 180L, 350L, 180L, 650L)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
      } else {
        @Suppress("DEPRECATION")
        vibrator?.vibrate(pattern, 0)
      }
    }
  }

  private fun stopAlert() {
    releaseAlert()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun releaseAlert() {
    mediaPlayer?.run {
      if (isPlaying) {
        stop()
      }
      release()
    }
    mediaPlayer = null
    vibrator?.cancel()
    vibrator = null
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val notificationManager = getSystemService(NotificationManager::class.java)
    if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }
    notificationManager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Active rest timer alert", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Continuous alert when workout rest is finished"
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        setSound(null, null)
        enableVibration(false)
      },
    )
  }

  companion object {
    private const val ACTION_START = "com.workoutlogger.mvp.START_TIMER_ALERT_SERVICE"
    private const val ACTION_STOP = "com.workoutlogger.mvp.STOP_TIMER_ALERT_SERVICE"
    private const val CHANNEL_ID = "workout_rest_timer_active_v2"
    private const val MODE_SOUND = "sound"
    private const val MODE_SOUND_VIBRATE = "sound-vibrate"
    private const val MODE_VIBRATE = "vibrate"
    private const val NOTIFICATION_ID = 5101
    private const val REQUEST_OPEN_APP = 5102
    private const val REQUEST_STOP_ALERT = 5103

    fun start(context: Context, mode: String, soundUri: String?, volume: Double) {
      val intent = Intent(context, WorkoutTimerAlertService::class.java).apply {
        action = ACTION_START
        putExtra(WorkoutTimerAlertReceiver.EXTRA_MODE, mode)
        putExtra(WorkoutTimerAlertReceiver.EXTRA_SOUND_URI, soundUri)
        putExtra(WorkoutTimerAlertReceiver.EXTRA_VOLUME, volume)
      }
      ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, WorkoutTimerAlertService::class.java))
    }
  }
}
