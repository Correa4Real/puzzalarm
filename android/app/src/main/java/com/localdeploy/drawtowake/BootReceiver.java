package com.localdeploy.drawtowake;

// external libs
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;

// ===== SERVICE =====
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(AlarmSchedulerPlugin.PREFS, Context.MODE_PRIVATE);
            String stored = prefs.getString(AlarmSchedulerPlugin.KEY_ALARMS, null);
            if (stored == null) return;
            AlarmSchedulerPlugin.scheduleList(context, new JSONArray(stored));
        } catch (Exception ignored) {
        }
    }
}
