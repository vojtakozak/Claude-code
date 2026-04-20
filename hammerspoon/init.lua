-- Fellaship Brain hotkeys
-- Append this block to your existing ~/.hammerspoon/init.lua

-- ============================================================
--  ⌃⌥⌘ + B   →  open capture (form with autofocus)
--  ⌃⌥⌘ + L   →  open browse
--  ⌃⌥⌘ + ;   →  open capture, then trigger Whisper hotkey
-- ============================================================

local RAYCAST_CAPTURE = 'open "raycast://extensions/vojta/fellaship-brain/capture"'
local RAYCAST_LIST    = 'open "raycast://extensions/vojta/fellaship-brain/list"'

-- Plain capture: open form, you type or paste
hs.hotkey.bind({"ctrl", "alt", "cmd"}, "b", function()
    hs.execute(RAYCAST_CAPTURE)
end)

-- Browse list
hs.hotkey.bind({"ctrl", "alt", "cmd"}, "l", function()
    hs.execute(RAYCAST_LIST)
end)

-- Combo: open capture, wait for the form to focus, then fire Whisper.
-- Whisper's own hotkey is user-configured (⌃⌥⌘ + Fn on this machine).
-- Fn is not detectable from Hammerspoon; we simulate Whisper via its menu-bar
-- app URL / Accessibility if available, or user can swap this combo for their
-- preferred Whisper trigger.
hs.hotkey.bind({"ctrl", "alt", "cmd"}, ";", function()
    hs.execute(RAYCAST_CAPTURE)
    hs.timer.doAfter(0.45, function()
        -- Try to launch Whisper if installed. Fallback: no-op.
        local apps = { "Whisper", "SuperWhisper", "MacWhisper" }
        for _, name in ipairs(apps) do
            local app = hs.application.get(name)
            if app then
                app:activate()
                return
            end
        end
        -- If Whisper is not running, just leave the capture form focused.
        hs.alert.show("Whisper app not found — použij vlastní hotkey pro diktát")
    end)
end)

hs.alert.show("🧠 Fellaship Brain loaded")
