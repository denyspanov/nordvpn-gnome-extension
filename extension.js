const Main = imports.ui.main;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {St, GLib, Clutter} = imports.gi;

let myPopup;

const DEFAULT_SERVER = 'United_Kingdom';
const COMMAND = 'nordvpn';

const MyPopup = GObject.registerClass(
    class NordVpnExtension extends PanelMenu.Button {

        _changeIcon(icon, name) {
            icon.gicon = Gio.icon_new_for_string(Me.dir.get_path() + '/' + name + '.svg')
        }

        _setProcessingStatus(icon) {
            this._changeIcon(icon, 'processing');
        }

        _setConnectedStatus(icon) {
            this._changeIcon(icon, 'connected');
        }

        _setDisconnectedStatus(icon) {
            this._changeIcon(icon, 'disconnected');
        }

        _connect(icon, country) {
            this._setProcessingStatus(icon)
            let params = [COMMAND, 'connect', DEFAULT_SERVER]
            if (country) {
                params = [COMMAND, 'connect', country]
            }
            let connect = Gio.Subprocess.new(
                params,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            connect.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    this.updateIconBasedOnStatus(icon)
                } catch (e) {
                    logError(e);
                }
            });
        }

        _disconnect(icon) {
            this._setProcessingStatus(icon)
            let disconnect = Gio.Subprocess.new(
                [COMMAND, 'disconnect'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            disconnect.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    this.updateIconBasedOnStatus(icon)
                } catch (e) {
                    logError(e);
                }
            });
        }

        _init() {
            super._init(0);
            let icon = new St.Icon({style_class: 'system-status-icon',});
            this.add_child(icon);
            this.addConnectAction(icon);
            this.addDisconnectAction(icon);
            this.updateIconBasedOnStatus(icon);
            this.addCountriesSubMenu(icon);
        }

        addCountriesSubMenu(icon) {
            let countriesList = Gio.Subprocess.new(
                [COMMAND, 'countries'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            let subItem = new PopupMenu.PopupSubMenuMenuItem('Countries');
            let popup = this;
            countriesList.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        let countries = stdout.toString().trim().split(', ');
                        countries.forEach(function (name) {
                            let clearedName = name.replace(/[^a-z0-9_]/gi, '');
                            let item = new PopupMenu.PopupMenuItem(clearedName.replace(/_/gi, ' '));
                            item.connect('activate', () => {
                                popup._connect(icon, clearedName)
                            });
                            subItem.menu.addMenuItem(item);
                        })
                    } else {
                        throw new Error(stderr);
                    }
                } catch (e) {
                    logError(e);
                }
            });
            this.menu.addMenuItem(subItem);
        }

        addDisconnectAction(icon) {
            let disconnect = new PopupMenu.PopupMenuItem('Disconnect');
            disconnect.connect('activate', () => {
                this._disconnect(icon)
            });
            this.menu.addMenuItem(disconnect);
        }

        addConnectAction(icon) {
            let connect = new PopupMenu.PopupMenuItem('Connect');
            connect.connect('activate', () => {
                this._connect(icon)
            });
            this.menu.addMenuItem(connect);
        }

        updateIconBasedOnStatus(icon) {
            this._setProcessingStatus(icon)
            let defineStatus = Gio.Subprocess.new(
                [COMMAND, 'status'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            defineStatus.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        let rows = stdout.split('\n');
                        let statusRow = rows[0];
                        if (statusRow.search(' Connected') > 0) {
                            this._setConnectedStatus(icon)
                        } else {
                            this._setDisconnectedStatus(icon)
                        }
                    } else {
                        throw new Error(stderr);
                    }
                } catch (e) {
                    logError(e);
                }
            });
        }
    });

function init() {
}

function enable() {
    myPopup = new MyPopup();
    Main.panel.addToStatusArea('myPopup', myPopup, 1);
}

function disable() {
    myPopup.destroy();
}
