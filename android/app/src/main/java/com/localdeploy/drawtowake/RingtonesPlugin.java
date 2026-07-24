package com.localdeploy.drawtowake;

// external libs
import android.content.Context;
import android.database.Cursor;
import android.media.AudioAttributes;
import android.media.AudioManager;
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
    private int savedMusicVolume = -1;
    private int savedAlarmVolume = -1;

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

    @PluginMethod
    public void boostVolumes(PluginCall call) {
        try {
            AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (savedMusicVolume < 0) savedMusicVolume = audio.getStreamVolume(AudioManager.STREAM_MUSIC);
            if (savedAlarmVolume < 0) savedAlarmVolume = audio.getStreamVolume(AudioManager.STREAM_ALARM);
            audio.setStreamVolume(AudioManager.STREAM_MUSIC, audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC), 0);
            audio.setStreamVolume(AudioManager.STREAM_ALARM, audio.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0);
        } catch (Exception ignored) {
        }
        call.resolve();
    }

    @PluginMethod
    public void restoreVolumes(PluginCall call) {
        try {
            AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (savedMusicVolume >= 0) audio.setStreamVolume(AudioManager.STREAM_MUSIC, savedMusicVolume, 0);
            if (savedAlarmVolume >= 0) audio.setStreamVolume(AudioManager.STREAM_ALARM, savedAlarmVolume, 0);
        } catch (Exception ignored) {
        }
        savedMusicVolume = -1;
        savedAlarmVolume = -1;
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
