package com.r3.aistudio;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. Keep content strictly inside safe system boundaries (prevent overlap with status & navigation bars)
        WindowCompat.setDecorFitsSystemWindows(window, true);

        // 2. Set clean system bar colors matching Nerdo's dark palette
        window.setStatusBarColor(Color.parseColor("#0e0f12"));
        window.setNavigationBarColor(Color.parseColor("#0e0f12"));
    }
}
