const Main = imports.ui.main;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {St, GLib, Clutter} = imports.gi;

let myPopup;

const MyPopup = GObject.registerClass(
    class NordVpnExtension extends PanelMenu.Button {

        _changeIcon(icon, name) {
            icon.gicon = Gio.icon_new_for_string(Me.dir.get_path() + '/' + name + '.svg')
        }

        _connect(icon, country) {
            let params = ['nordvpn', 'connect', 'United_Kingdom']
            if (country) {
                params = ['nordvpn', 'connect', country]
            }

            let connect = Gio.Subprocess.new(
                params,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            connect.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        let rows = stdout.split('\n');
                        let statusRow = rows[1];
                        if (statusRow.search(' connected ') > 0) {
                            this._changeIcon(icon, 'connected')
                        }

                    } else {
                        throw new Error(stderr);
                    }
                } catch (e) {
                    logError(e);
                }
            });
        }

        _disconnect(icon) {
            let disconnect = Gio.Subprocess.new(
                ['nordvpn', 'disconnect'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            disconnect.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        let rows = stdout.split('\n');
                        let statusRow = rows[0];
                        if (statusRow.search(' disconnected ') > 0) {
                            this._changeIcon(icon, 'disconnected')
                        }

                    } else {
                        throw new Error(stderr);
                    }
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
            this.defineStatus(icon);
            this.addCountriesSubMenu(icon);
        }

        addCountriesSubMenu(icon) {
            let countriesList = Gio.Subprocess.new(
                ['nordvpn', 'countries'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            let subItem = new PopupMenu.PopupSubMenuMenuItem('Countries');
            countriesList.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        let countries = stdout.toString().trim().split(', ');
                        let i = 0
                        countries.forEach(function (name) {
                            if (i > 0) {
                                let item = new PopupMenu.PopupMenuItem(name);
                                item.connect('activate', () => {
                                    MyPopup._connect(icon, name)
                                });
                                subItem.menu.addMenuItem(item);
                            }
                            i++
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

        defineStatus(icon) {
            let defineStatus = Gio.Subprocess.new(
                ['nordvpn', 'status'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            defineStatus.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        let rows = stdout.split('\n');
                        let statusRow = rows[0];
                        if (statusRow.search(' Connected') > 0) {
                            icon.gicon = Gio.icon_new_for_string(Me.dir.get_path() + '/connected.svg')
                        } else {
                            icon.gicon = Gio.icon_new_for_string(Me.dir.get_path() + '/disconnected.svg')
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
