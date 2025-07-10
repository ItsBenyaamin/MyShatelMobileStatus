import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

 export default class PersianCalendarPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        
        // Indicator position settings
        const indicatorGroup = new Adw.PreferencesGroup();
        page.add(indicatorGroup);

        const indicatorPosRow = new Adw.ActionRow({title: 'Position'});
        indicatorGroup.add(indicatorPosRow);

        const indicatorPos = new Gtk.ComboBoxText({
            active: settings.get_string('indicator-position'),
        });
        indicatorPos.append('left', 'left');
        indicatorPos.append('center', 'center');
        indicatorPos.append('right', 'right');
        settings.bind(
            'indicator-position',
            indicatorPos,
            'active-id',
            Gio.SettingsBindFlags.DEFAULT
        );
        indicatorPosRow.add_suffix(indicatorPos);

        const indicatorIndex = new Gtk.SpinButton();
        let indicatorIndexAdjustment = new Gtk.Adjustment();
        indicatorIndexAdjustment.set_lower(-99);
        indicatorIndexAdjustment.set_upper(99);
        indicatorIndexAdjustment.set_step_increment(1);
        indicatorIndex.set_adjustment(indicatorIndexAdjustment);
        indicatorIndex.set_value(settings.get_int('indicator-index'));
        settings.bind('indicator-index', indicatorIndex, 'value', Gio.SettingsBindFlags.DEFAULT);

        indicatorPosRow.add_suffix(indicatorIndex);

        // General setting
        const generalGroup = new Adw.PreferencesGroup();
        page.add(generalGroup);

        const intervalRow = new Adw.ActionRow({title: 'Update in every(as minutes)'});
        generalGroup.add(intervalRow);

        const intervalDuration = new Gtk.SpinButton();
        let intervalDurationAdjustment = new Gtk.Adjustment();
        intervalDurationAdjustment.set_lower(1);
        intervalDurationAdjustment.set_upper(500);
        intervalDurationAdjustment.set_step_increment(1);
        intervalDuration.set_adjustment(intervalDurationAdjustment);
        intervalDuration.set_value(settings.get_int('interval-duration'));
        settings.bind('interval-duration', intervalDuration, 'value', Gio.SettingsBindFlags.DEFAULT);

        intervalRow.add_suffix(intervalDuration);

        const shouldShowExpireRow = new Adw.ActionRow({title: "Should show expire date"});
        generalGroup.add(shouldShowExpireRow);

        const shouldShowExpireSwitch = new Gtk.Switch({
            active: settings.get_boolean('should-show-expire'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind(
            'should-show-expire',
            shouldShowExpireSwitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        shouldShowExpireRow.add_suffix(shouldShowExpireSwitch);


        const headersRow = new Adw.ActionRow({title: "Request you copied"});
        generalGroup.add(headersRow);

        const headersEntry = new Gtk.Entry({
            hexpand: true,
        });
        headersRow.add_suffix(headersEntry);

        settings.bind(
            'curl-string',
            headersEntry,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );

        window.add(page);
    }
}
