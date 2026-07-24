package com.localdeploy.drawtowake;

// external libs
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

// ===== CONFIGURATIONS =====
public class AlarmReceiver extends BroadcastReceiver {

    static final String CHANNEL_ID = "drawtowake_alarm";
    static final String EXTRA_ALARM_ID = "alarmId";
    static final String EXTRA_NOTIF_ID = "notifId";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_BODY = "body";

    // ===== SERVICE =====
    @Override
    public void onReceive(Context context, Intent intent) {
        String alarmId = intent.getStringExtra(EXTRA_ALARM_ID);
        int notifId = intent.getIntExtra(EXTRA_NOTIF_ID, 1);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        if (alarmId == null) return;

        wakeScreen(context);
        createChannel(context);

        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        launch.putExtra(EXTRA_ALARM_ID, alarmId);
        PendingIntent fullScreen = PendingIntent.getActivity(
            context, notifId, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle(title != null ? title : "Draw to Wake")
            .setContentText(body != null ? body : "")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreen, true)
            .setContentIntent(fullScreen)
            .setOngoing(true)
            .setAutoCancel(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();

        try {
            context.getSystemService(NotificationManager.class).notify(notifId, notification);
        } catch (Exception ignored) {
        }

        try {
            context.startActivity(launch);
        } catch (Exception ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    private static void wakeScreen(Context context) {
        try {
            PowerManager power = context.getSystemService(PowerManager.class);
            PowerManager.WakeLock lock = power.newWakeLock(
                PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                "drawtowake:alarm"
            );
            lock.acquire(10000);
        } catch (Exception ignored) {
        }
    }

    // ===== UTILITIES =====
    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Alarmes", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Alarmes do Draw to Wake");
        channel.setBypassDnd(true);
        channel.enableVibration(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        );
        manager.createNotificationChannel(channel);
    }
}
