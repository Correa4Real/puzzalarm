package com.tistars.puzzalarm;

// external libs
import android.database.Cursor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// ===== CONFIGURATIONS =====
@CapacitorPlugin(name = "Ringtones")
public class RingtonesPlugin extends Plugin {

    private MediaPlayer player;

    // ===== SERVICE =====
    @PluginMethod
    public void list(PluginCall call) {
        JSArray ringtones = new JSArray();
        int[] types = { RingtoneManager.TYPE_ALARM, RingtoneManager.TYPE_RINGTONE };
        for (int type : types) {
            RingtoneManager manager = new RingtoneManager(getContext());
            manager.setType(type);
            Cursor cursor = manager.getCursor();
            while (cursor.moveToNext()) {
                String title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                Uri uri = manager.getRingtoneUri(cursor.getPosition());
                JSObject item = new JSObject();
                item.put("title", title);
                item.put("uri", uri.toString());
                ringtones.put(item);
            }
        }
        JSObject result = new JSObject();
        result.put("ringtones", ringtones);
        call.resolve(result);
    }

    @PluginMethod
    public void play(PluginCall call) {
        String uriString = call.getString("uri");
        Float volume = call.getFloat("volume", 1.0f);
        if (uriString == null) {
            call.reject("uri is required");
            return;
        }
        stopPlayer();
        try {
            MediaPlayer mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            mediaPlayer.setDataSource(getContext(), Uri.parse(uriString));
            mediaPlayer.setLooping(true);
            mediaPlayer.setVolume(volume, volume);
            mediaPlayer.prepare();
            mediaPlayer.start();
            player = mediaPlayer;
            call.resolve();
        } catch (Exception e) {
            call.reject("failed to play ringtone", e);
        }
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Float volume = call.getFloat("volume", 1.0f);
        if (player != null) {
            player.setVolume(volume, volume);
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopPlayer();
        call.resolve();
    }

    // ===== UTILITIES =====
    private void stopPlayer() {
        if (player != null) {
            try {
                player.stop();
                player.release();
            } catch (Exception ignored) {
            }
            player = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopPlayer();
    }
}
