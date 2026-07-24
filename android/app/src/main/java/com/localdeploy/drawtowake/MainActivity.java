package com.localdeploy.drawtowake;

// external libs
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

// ===== MAIN ACTIVITY =====
public class MainActivity extends BridgeActivity {

    private static volatile String pendingAlarmId = null;

    static String consumePendingAlarmId() {
        String id = pendingAlarmId;
        pendingAlarmId = null;
        return id;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RingtonesPlugin.class);
        registerPlugin(AlarmSchedulerPlugin.class);
        super.onCreate(savedInstanceState);
        applyLockScreenFlags();
        handleAlarmIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleAlarmIntent(intent);
    }

    private void handleAlarmIntent(Intent intent) {
        if (intent == null) return;
        String alarmId = intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID);
        if (alarmId != null) pendingAlarmId = alarmId;
    }

    private void applyLockScreenFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
