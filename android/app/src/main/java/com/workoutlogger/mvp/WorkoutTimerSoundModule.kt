package com.workoutlogger.mvp

import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.WindowManager
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

class WorkoutTimerSoundModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pendingPromise: Promise? = null
  private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode != ringtonePickerRequestCode) {
        return
      }

      val promise = pendingPromise ?: return
      pendingPromise = null

      if (resultCode != Activity.RESULT_OK) {
        promise.resolve(soundResult(null, null))
        return
      }

      val uri = data?.getParcelableExtra<Uri>(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
      val title = uri?.let { RingtoneManager.getRingtone(reactContext, it)?.getTitle(reactContext) }
      promise.resolve(soundResult(uri?.toString(), title))
    }
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "WorkoutTimerSound"

  @ReactMethod
  fun playNotificationSound(uri: String?, volume: Double) {
    showTimerAlert()
    WorkoutTimerAlertPlayer.play(reactContext, uri, volume)
  }

  @ReactMethod
  fun stopSound() {
    WorkoutTimerAlertPlayer.stop()
    WorkoutTimerAlertService.stop(reactContext)
    cancelScheduledTimerAlert()
    dismissTimerAlert()
  }

  @ReactMethod
  fun scheduleTimerAlert(delayMs: Double, mode: String, uri: String?, volume: Double) {
    cancelScheduledTimerAlert()
    if (mode == "silent") {
      return
    }

    val delay = delayMs.toLong().coerceAtLeast(0L)
    scheduleSystemAlarm(delay, mode, uri, volume)

  }

  @ReactMethod
  fun cancelScheduledTimerAlert() {
    alarmManager().cancel(timerAlertPendingIntent(null, null))
    WorkoutTimerAlertService.stop(reactContext)
  }

  @ReactMethod
  fun showTimerAlert() {
    val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
    }
    if (launchIntent != null) {
      reactContext.startActivity(launchIntent)
    }

    currentActivity?.runOnUiThread {
      val activity = currentActivity ?: return@runOnUiThread
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(true)
        activity.setTurnScreenOn(true)
      } else {
        @Suppress("DEPRECATION")
        activity.window.addFlags(
          WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        )
      }
      activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
  }

  @ReactMethod
  fun dismissTimerAlert() {
    currentActivity?.runOnUiThread {
      val activity = currentActivity ?: return@runOnUiThread
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(false)
        activity.setTurnScreenOn(false)
      } else {
        @Suppress("DEPRECATION")
        activity.window.clearFlags(
          WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        )
      }
      activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
  }

  @ReactMethod
  fun pickNotificationSound(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("timer_sound.no_activity", "Activity is not available")
      return
    }

    pendingPromise = promise
    val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
      putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
      putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Select timer sound")
      putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
      putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
      putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
    }
    activity.startActivityForResult(intent, ringtonePickerRequestCode)
  }

  private fun soundResult(uri: String?, title: String?): WritableNativeMap =
    WritableNativeMap().apply {
      putString("uri", uri)
      putString("title", title)
    }

  private fun vibrateTimerAlert() {
    val vibrator = reactContext.getSystemService(Vibrator::class.java)
    val pattern = longArrayOf(0L, 250L, 150L, 250L)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
    } else {
      @Suppress("DEPRECATION")
      vibrator?.vibrate(pattern, -1)
    }
  }

  private fun alarmManager(): AlarmManager =
    reactContext.getSystemService(AlarmManager::class.java)

  private fun scheduleSystemAlarm(delayMs: Long, mode: String, uri: String?, volume: Double) {
    val manager = alarmManager()
    val pendingIntent = timerAlertPendingIntent(mode, uri, volume)
    val triggerAtMillis = System.currentTimeMillis() + delayMs
    val elapsedTriggerAtMillis = SystemClock.elapsedRealtime() + delayMs

    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()) {
        manager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAtMillis, pendingIntent), pendingIntent)
        return
      }
    } catch (_: SecurityException) {
      // Some Android builds still deny exact alarms despite the manifest permission.
    }

    manager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, elapsedTriggerAtMillis, pendingIntent)
  }

  private fun timerAlertPendingIntent(mode: String?, uri: String?, volume: Double = 1.0): PendingIntent {
    val intent = Intent(reactContext, WorkoutTimerAlertReceiver::class.java).apply {
      action = WorkoutTimerAlertReceiver.ACTION_TIMER_ALERT
      putExtra(WorkoutTimerAlertReceiver.EXTRA_MODE, mode ?: "vibrate")
      if (uri != null) {
        putExtra(WorkoutTimerAlertReceiver.EXTRA_SOUND_URI, uri)
      }
      putExtra(WorkoutTimerAlertReceiver.EXTRA_VOLUME, volume)
    }
    return PendingIntent.getBroadcast(
      reactContext,
      timerAlertRequestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  companion object {
    private const val ringtonePickerRequestCode = 7401
    private const val timerAlertRequestCode = 7403
  }
}
