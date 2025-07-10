import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import GioUnix from 'gi://GioUnix';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

let lastRemainedValue = "";
let lastExpireDate = "";
let label, intervalId, shouldShowExpireAt, intervalDuration, curlString;

function _getValue(callback) {
    if(curlString == "") {
        callback("Error on headers!");
        return;
    }

    const [ok, argv] = GLib.shell_parse_argv(curlString);
    if (!ok || argv.length === 0) {
        callback("Request is empty!")
        return;
    }

    if (argv[0] !== 'curl') {
        callback("Request is wrong!");
        return;
    }

    try {
        let [success, pid, stdin_fd, stdout_fd, stderr_fd] = GLib.spawn_async_with_pipes(
            null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null
        );
	
        if (!success) {
            callback("Error");
            return;
        }

        const stdoutStream = new GioUnix.InputStream({ fd: stdout_fd, close_fd: true });
        const dataStream = new Gio.DataInputStream({ base_stream: stdoutStream });

        dataStream.read_bytes_async(4096, GLib.PRIORITY_DEFAULT, null, (stream, res) => {
            try {
		const bytes = stream.read_bytes_finish(res);
		const output = new TextDecoder().decode(bytes.get_data());
                const json = JSON.parse(output);

                const unit = (json.internet_used_unit === "گیگابایت") ? "GB" : "MB";
		lastRemainedValue = `${json.internet_used}  ${unit}`;
                lastExpireDate = "";

                const packages = json.internet_packages;
                if(packages.length > 0) {
                    lastExpireDate = packages[0].expire;
                }
                const remained = _getValueWithLastValues();
                callback(remained);
            } catch (e) {
                logError(e);
                callback("Error");
            }
        });
    } catch (e) {
        logError(e);
        callback("Error");
    }
}

function _updateLabel(retries = 3) {
    function attempt(remainingTries) {
        _getValue((value) => {
            if (value !== "Error") {
                if (label) {
                    label.set_text(value);
                }
            } else if (remainingTries > 0) {
		label.set_text("📡  Failed, retrying...");
                // Wait 1 second then retry
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                    attempt(remainingTries - 1);
                    return GLib.SOURCE_REMOVE;
                });
            } else {
                label.set_text("📡  Error!");
            }
        });
    }

    attempt(retries);
}

function _newInterval() {
    const duration = intervalDuration * 60;
    intervalId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, duration, () => {
        _updateLabel();
        return true;
    });
}

function _getValueWithLastValues() {
    let labelValue = `📡  ${lastRemainedValue}`;
    if(shouldShowExpireAt) {
        labelValue = `${labelValue} - ${lastExpireDate}`;
    }
    return labelValue;
}

export default class MyShatelMobileStatus extends Extension {
    enable() {
        this.settings = this.getSettings();

        intervalDuration = this.settings.get_int('interval-duration');
        shouldShowExpireAt = this.settings.get_boolean('should-show-expire');
        curlString = this.settings.get_string('curl-string');


        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        label = new St.Label({
            text: "📡  Loading...",
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true  
        });
        this._indicator.add_child(label);
        
        Main.panel.addToStatusArea(
            this.uuid,
            this._indicator,
            this.settings.get_int('indicator-index'),
            this.settings.get_string('indicator-position')
        );
        
        if(lastRemainedValue == "") {
	    label.set_text("📡  Loading...");
        }else {
            _getValueWithLastValues();
        }
        
        _updateLabel();
        _newInterval();
        
        this.settings.connect('changed::should-show-expire', () => {
            shouldShowExpireAt = this.settings.get_boolean('should-show-expire');
            label.set_text(_getValueWithLastValues());
        });


        this.settings.connect('changed::interval-duration', () => {
            intervalDuration = this.settings.get_int('interval-duration');
            if(intervalId) {
                GLib.Source.remove(intervalId);
                intervalId = null;
            }
            _newInterval();
        });

        this.settings.connect('changed::indicator-position', () => {
            this._indicator.destroy();
            this._indicator = null;
            this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
            const value = _getValueWithLastValues();
            label = new St.Label({
                text: value,
                y_align: Clutter.ActorAlign.CENTER,
                y_expand: true  
            });
            this._indicator.add_child(label);

            Main.panel.addToStatusArea(
                this.uuid,
                this._indicator,
                this.settings.get_int('indicator-index'),
                this.settings.get_string('indicator-position')
            );
        });

        this.settings.connect('changed::indicator-index', () => {
            this._indicator.destroy();
            this._indicator = null;
            this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
            const value = _getValueWithLastValues();
            label = new St.Label({
                text: value,
                y_align: Clutter.ActorAlign.CENTER,
                y_expand: true  
            });
            this._indicator.add_child(label);

            Main.panel.addToStatusArea(
                this.uuid,
                this._indicator,
                this.settings.get_int('indicator-index'),
                this.settings.get_string('indicator-position')
            );
        });

        this.settings.connect('changed::curl-string', () => {
            curlString = this.settings.get_string("curl-string");
            label.set_text("📡  Loading...");
            _updateLabel();
        });

    }

    disable() {
        if(this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        
        if (intervalId) {
            GLib.Source.remove(intervalId);
            intervalId = null;
        }

        label = null;
        intervalDuration = null;
        curlString = null;
        shouldShowExpireAt = null;

        this.settings = null;
    }
}
