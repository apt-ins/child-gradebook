package app.xueji.journal;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;

/** Save an already-created backup through Android's document picker, without storage permission. */
@CapacitorPlugin(name = "LocalFiles")
public class LocalFilesPlugin extends Plugin {
    private boolean saving;

    private File exportFile(PluginCall call) throws Exception {
        String path = call.getString("path", "");
        File root = new File(getContext().getCacheDir(), "exports").getCanonicalFile();
        File file = new File(getContext().getCacheDir(), path).getCanonicalFile();
        if (!file.getPath().startsWith(root.getPath() + File.separator) || !file.isFile()) {
            throw new Exception("无效的导出文件");
        }
        return file;
    }

    @PluginMethod
    public void save(PluginCall call) {
        if (saving) {
            call.reject("请先完成当前文件保存");
            return;
        }
        try {
            File file = exportFile(call);
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(file.getName().endsWith(".zip") ? "application/zip" : "text/csv");
            intent.putExtra(Intent.EXTRA_TITLE, file.getName());
            saving = true;
            startActivityForResult(call, intent, "documentSelected");
        } catch (Exception error) {
            saving = false;
            call.reject("无法打开文件保存窗口", error);
        }
    }

    @ActivityCallback
    private void documentSelected(PluginCall call, ActivityResult result) {
        if (call == null) { saving = false; return; }
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            saving = false;
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }
        getBridge().execute(() -> {
            try {
                File source = exportFile(call);
                try (FileInputStream input = new FileInputStream(source);
                     OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "w")) {
                    if (output == null) throw new Exception("目标文件无法写入");
                    byte[] buffer = new byte[65536];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    output.flush();
                }
                source.delete();
                JSObject response = new JSObject();
                response.put("cancelled", false);
                call.resolve(response);
            } catch (Exception error) {
                call.reject("文件未保存成功，请重新导出", error);
            } finally {
                saving = false;
            }
        });
    }
}
