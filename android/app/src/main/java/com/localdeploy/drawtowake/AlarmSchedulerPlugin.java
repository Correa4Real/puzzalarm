package com.localdeploy.drawtowake;

// external libs
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

// ===== CONFIGURATIONS =====
@CapacitorPlugin(name = "AlarmScheduler")
public class AlarmSchedulerPlugin extends Plugin {

    static final String PREFS = "drawtowake_scheduler";
    static final String KEY_CODES = "codes";
    static final String KEY_ALARMS = "alarms";

    // ===== SERVICE =====
    @PluginMethod
    public void schedule(PluginCall call) {
        try {
            JSONArray alarms = call.getArray("alarms");
            if (alarms == null) alarms = new JSONArray();
            cancelStored(getContext());
            scheduleList(getContext(), alarms);
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            Set<String> codes = new HashSet<>();
            for (int i = 0; i < alarms.length(); i++) {
                codes.add(String.valueOf(alarms.getJSONObject(i).getInt("notifId")));
            }
            prefs.edit().putStringSet(KEY_CODES, codes).putString(KEY_ALARMS, alarms.toString()).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("failed to schedule alarms", e);
        }
    }

    @PluginMethod
    public void consumeLaunchAlarmId(PluginCall call) {
        JSObject result = new JSObject();
        result.put("alarmId", MainActivity.consumePendingAlarmId());
        call.resolve(result);
    }

    @PluginMethod
    public void canUseFullScreenIntent(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= 34) {
            try {
                granted = getContext().getSystemService(NotificationManager.class).canUseFullScreenIntent();
            } catch (Exception ignored) {
            }
        }
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void openFullScreenIntentSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception ignored) {
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void dismissNotifications(PluginCall call) {
        try {
            getContext().getSystemService(NotificationManager.class).cancelAll();
        } catch (Exception ignored) {
        }
        call.resolve();
    }

    void emitAlarmFired(String alarmId) {
        JSObject data = new JSObject();
        data.put("alarmId", alarmId);
        notifyListeners("alarmFired", data);
    }

    // ===== UTILITIES =====
    static void cancelStored(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> codes = prefs.getStringSet(KEY_CODES, new HashSet<>());
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        for (String code : codes) {
            Intent intent = new Intent(context, AlarmReceiver.class);
            PendingIntent pending = PendingIntent.getBroadcast(
                context, Integer.parseInt(code), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            manager.cancel(pending);
        }
    }

    static void scheduleList(Context context, JSONArray alarms) throws Exception {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        long now = System.currentTimeMillis();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject item = alarms.getJSONObject(i);
            long at = item.getLong("at");
            if (at <= now) continue;
            int notifId = item.getInt("notifId");

            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra(AlarmReceiver.EXTRA_ALARM_ID, item.getString("id"));
            intent.putExtra(AlarmReceiver.EXTRA_NOTIF_ID, notifId);
            intent.putExtra(AlarmReceiver.EXTRA_TITLE, item.optString("title", "Draw to Wake"));
            intent.putExtra(AlarmReceiver.EXTRA_BODY, item.optString("body", ""));
            PendingIntent firePending = PendingIntent.getBroadcast(
                context, notifId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent show = new Intent(context, MainActivity.class);
            PendingIntent showPending = PendingIntent.getActivity(
                context, 0, show,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            try {
                manager.setAlarmClock(new AlarmManager.AlarmClockInfo(at, showPending), firePending);
            } catch (SecurityException e) {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, firePending);
            }
        }
    }
}
