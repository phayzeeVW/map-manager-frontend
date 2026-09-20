import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  Folder,
  Gamepad2,
  HardDrive,
  History,
  Info,
  Layers,
  LayoutGrid,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Table as TableIcon,
  X,
} from 'lucide-react';

interface InstallLog {
    id: string;
    mapName: string;
    status: 'loading' | 'success' | 'error';
    message: string;
    time: string;
}

const DEFAULT_CS_DIR = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Half-Life\\cstrike';
const STORAGE_KEY_DIR = 'kz_install_dir';

export default function App() {
    const [maps, setMaps] = useState<string[]>([]);
    const [installDir, setInstallDir] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY_DIR) || DEFAULT_CS_DIR;
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    // Per-map installation tracking
    const [installingMap, setInstallingMap] = useState<string | null>(null);

    // Status and Logs
    const [logs, setLogs] = useState<InstallLog[]>([]);
    const [latestStatus, setLatestStatus] = useState<{
        type: 'success' | 'error' | 'info';
        message: string
    } | null>(null);
    const [isLoadingMaps, setIsLoadingMaps] = useState(true);
    const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
    const [showLogDrawer, setShowLogDrawer] = useState(false);

    // Save directory preference
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_DIR, installDir);
    }, [installDir]);

    // Initial load
    useEffect(() => {
        let ignore = false;

        fetch('/api/local/maps')
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                return res.json();
            })
            .then((data) => {
                if (!ignore) {
                    const mapList: string[] = Array.isArray(data)
                        ? data.map((item) => (typeof item === 'string' ? item : item.name || String(item)))
                        : [];
                    setMaps(mapList);
                    setBackendOnline(true);
                    setIsLoadingMaps(false);
                }
            })
            .catch((err: unknown) => {
                if (!ignore) {
                    console.error('Error fetching maps:', err);
                    setBackendOnline(false);
                    setLatestStatus({
                        type: 'error',
                        message: 'Could not connect to local backend service on port 8081. Ensure Spring Boot is running.',
                    });
                    setIsLoadingMaps(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, []);

    // Manual refresh callback
    const handleRefreshMaps = useCallback(async () => {
        setIsLoadingMaps(true);
        try {
            const res = await fetch('/api/local/maps');
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            const data = await res.json();
            const mapList: string[] = Array.isArray(data)
                ? data.map((item) => (typeof item === 'string' ? item : item.name || String(item)))
                : [];
            setMaps(mapList);
            setBackendOnline(true);
        } catch (err: unknown) {
            console.error('Error refreshing maps:', err);
            setBackendOnline(false);
            setLatestStatus({
                type: 'error',
                message: 'Could not connect to local backend service on port 8081. Ensure Spring Boot is running.',
            });
        } finally {
            setIsLoadingMaps(false);
        }
    }, []);

    const handleDownloadAndInstall = async (mapName: string) => {
        if (!installDir.trim()) {
            setLatestStatus({
                type: 'error',
                message: 'Please provide a valid destination installation directory.',
            });
            return;
        }

        setInstallingMap(mapName);
        setLatestStatus({
            type: 'info',
            message: `Downloading and installing ${mapName}...`,
        });

        const logId = `${Date.now()}-${mapName}`;
        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});

        setLogs((prev) => [
            {
                id: logId,
                mapName,
                status: 'loading',
                message: `Download started for ${mapName}`,
                time: timestamp,
            },
            ...prev,
        ]);

        try {
            const response = await fetch('/api/local/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mapName: mapName,
                    targetDirectory: installDir.trim(),
                }),
            });

            const result = await response.text();

            if (response.ok) {
                setLatestStatus({
                    type: 'success',
                    message: result || `Successfully installed ${mapName}!`,
                });
                setLogs((prev) =>
                    prev.map((log) =>
                        log.id === logId
                            ? {...log, status: 'success', message: result || `Successfully installed`}
                            : log
                    )
                );
            } else {
                throw new Error(result || `Server returned code ${response.status}`);
            }
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : `Error installing ${mapName}`;
            setLatestStatus({
                type: 'error',
                message: errMsg,
            });
            setLogs((prev) =>
                prev.map((log) =>
                    log.id === logId ? {...log, status: 'error', message: errMsg} : log
                )
            );
        } finally {
            setInstallingMap(null);
        }
    };

    // Filter and sort maps
    const filteredMaps = useMemo(() => {
        return maps
            .filter((map) => {
                const matchesSearch = map.toLowerCase().includes(searchQuery.toLowerCase().trim());
                return matchesSearch;
            })
            .sort((a, b) => {
                return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
            });
    }, [maps, searchQuery, sortOrder]);

    const resetToDefaultDir = () => {
        setInstallDir(DEFAULT_CS_DIR);
    };

    return (
        <div
            className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
            {/* Top Navigation Bar */}
            <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="h-10 w-10 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
                            <Gamepad2 className="w-5 h-5 text-white"/>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold tracking-tight text-white m-0">Kreedz Map
                                    Installer</h1>
                                <span
                                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  CS 1.6 KZ
                </span>
                            </div>
                            <p className="text-xs text-slate-400 hidden sm:block">One-click download & direct local
                                installation</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Backend Status Pill */}
                        <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                                backendOnline === true
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : backendOnline === false
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                        >
              <span
                  className={`w-2 h-2 rounded-full ${
                      backendOnline === true
                          ? 'bg-emerald-400 animate-pulse'
                          : backendOnline === false
                              ? 'bg-rose-400'
                              : 'bg-slate-400'
                  }`}
              />
                            <span className="hidden md:inline">
                {backendOnline === true ? 'Backend Connected' : backendOnline === false ? 'Backend Offline' : 'Connecting...'}
              </span>
                        </div>

                        {/* Logs Button */}
                        <button
                            onClick={() => setShowLogDrawer(!showLogDrawer)}
                            className="relative p-2 cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                            title="View activity history"
                        >
                            <History className="w-5 h-5"/>
                            {logs.length > 0 && (
                                <span
                                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-900"/>
                            )}
                        </button>

                        {/* Refresh Maps */}
                        <button
                            onClick={handleRefreshMaps}
                            disabled={isLoadingMaps}
                            className="flex cursor-pointer items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition disabled:opacity-50"
                            title="Refresh maps from backend"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 ${isLoadingMaps ? 'animate-spin text-indigo-400' : ''}`}/>
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Status Message Alert */}
                {latestStatus && (
                    <div
                        className={`p-4 rounded-xl border flex items-start justify-between gap-3 shadow-sm transition-all duration-200 ${
                            latestStatus.type === 'success'
                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                                : latestStatus.type === 'error'
                                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                                    : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            {latestStatus.type === 'success' &&
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"/>}
                            {latestStatus.type === 'error' &&
                                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5"/>}
                            {latestStatus.type === 'info' &&
                                <Loader2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-spin"/>}
                            <div className="text-sm">
                                <p className="font-semibold capitalize">{latestStatus.type}</p>
                                <p className="opacity-90 mt-0.5">{latestStatus.message}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setLatestStatus(null)}
                            className="text-current opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md"
                        >
                            <X className="w-4 h-4 cursor-pointer"/>
                        </button>
                    </div>
                )}

                {/* Directory Configuration Card */}
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-indigo-400"/>
                                <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
                                    Counter-Strike Target Directory
                                </h2>
                            </div>
                            <p className="text-xs text-slate-400">
                                Maps and assets (.bsp, .wad, etc.) will be placed directly into this folder.
                            </p>
                        </div>

                        <button
                            onClick={resetToDefaultDir}
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition self-start md:self-auto"
                        >
                            <RotateCcw className="w-3.5 h-3.5"/>
                            Reset to default Steam path
                        </button>
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <div
                                className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                <HardDrive className="w-4 h-4"/>
                            </div>
                            <input
                                type="text"
                                value={installDir}
                                onChange={(e) => setInstallDir(e.target.value)}
                                placeholder="C:\Program Files (x86)\Steam\steamapps\common\Half-Life\cstrike"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition font-mono"
                            />
                        </div>
                    </div>
                </section>

                {/* Search, Filter, and Controls */}
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search
                                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search map name (e.g. kz_longjumps, climbers)..."
                                className="w-full pl-10 pr-9 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                            )}
                        </div>

                        {/* View Mode & Sorters */}
                        <div className="flex items-center gap-2 self-end md:self-auto">
                            {/* Sort Order Toggle */}
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                            >
                                <span>Sort: {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
                            </button>

                            {/* View Switcher */}
                            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-1.5 rounded-lg text-xs transition ${
                                        viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                    title="Table view"
                                >
                                    <TableIcon className="w-4 h-4"/>
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg text-xs transition ${
                                        viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                    title="Grid view"
                                >
                                    <LayoutGrid className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Maps Content Area */}
                <section
                    className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
                    {/* Header summary info */}
                    <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-400"/>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Available Maps</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {filteredMaps.length}
              </span>
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoadingMaps ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500"/>
                            <p className="text-sm">Connecting to local server and fetching maps...</p>
                        </div>
                    ) : filteredMaps.length === 0 ? (
                        /* Empty State */
                        <div className="py-16 px-4 text-center max-w-md mx-auto">
                            <div
                                className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
                                <Search className="w-6 h-6"/>
                            </div>
                            <h3 className="text-base font-semibold text-slate-200">No maps found</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                {searchQuery
                                    ? `No maps match the query "${searchQuery}" or selected category.`
                                    : 'Backend returned 0 maps. Check if your Spring Boot service is connected to the Kreedz repository.'}
                            </p>
                            {(searchQuery) && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                    }}
                                    className="mt-4 px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : viewMode === 'table' ? (
                        /* Table View */
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                                    <th className="py-3 px-6 w-12 text-slate-600">#</th>
                                    <th className="py-3 px-6">Map Name</th>
                                    <th className="py-3 px-6">Status</th>
                                    <th className="py-3 px-6 text-right">Action</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {filteredMaps.map((mapName, index) => {
                                    const isInstalling = installingMap === mapName;
                                    mapName.match(/^([a-zA-Z]+_)/)?.[1] || 'custom';
                                    return (
                                        <tr
                                            key={mapName}
                                            className="hover:bg-slate-800/40 transition-colors group"
                                        >
                                            <td className="py-3.5 px-6 text-xs text-slate-600 font-mono">
                                                {index + 1}
                                            </td>
                                            <td className="py-3.5 px-6 font-medium text-white group-hover:text-indigo-300 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm tracking-wide">{mapName}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6">
                                                {isInstalling && (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                              <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                              Downloading...
                            </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-6 text-right">
                                                <button
                                                    onClick={() => handleDownloadAndInstall(mapName)}
                                                    disabled={installingMap !== null}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition active:scale-95 disabled:opacity-50`}
                                                >
                                                    {isInstalling ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                                            <span>Installing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-3.5 h-3.5"/>
                                                            <span>Install</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Grid View */
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMaps.map((mapName) => {
                                const isInstalling = installingMap === mapName;
                                const prefix = mapName.match(/^([a-zA-Z]+_)/)?.[1] || 'custom';

                                return (
                                    <div
                                        key={mapName}
                                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-4 group hover:shadow-lg hover:shadow-indigo-500/5"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50 uppercase font-mono">
                          {prefix}
                        </span>
                                            </div>
                                            <h4 className="font-mono text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors break-all">
                                                {mapName}
                                            </h4>
                                        </div>

                                        <button
                                            onClick={() => handleDownloadAndInstall(mapName)}
                                            disabled={installingMap !== null}
                                            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50`}
                                        >
                                            {isInstalling ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                                    <span>Installing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-3.5 h-3.5"/>
                                                    <span>Download & Install</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {/* Activity Logs Drawer */}
            {showLogDrawer && (
                <div
                    className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-indigo-400"/>
                            <h3 className="text-sm font-semibold text-white">Activity & Installation Log</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {logs.length > 0 && (
                                <button
                                    onClick={() => setLogs([])}
                                    className="text-xs text-slate-400 hover:text-rose-400 transition"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={() => setShowLogDrawer(false)}
                                className="p-1 rounded-md text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                        {logs.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 text-xs">
                                <Info className="w-6 h-6 mx-auto mb-2 opacity-50"/>
                                No actions logged yet in this session.
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono font-semibold text-slate-200">{log.mapName}</span>
                                        <span className="text-[10px] text-slate-500">{log.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {log.status === 'loading' &&
                                            <Loader2 className="w-3 h-3 text-indigo-400 animate-spin"/>}
                                        {log.status === 'success' && <Check className="w-3 h-3 text-emerald-400"/>}
                                        {log.status === 'error' && <AlertCircle className="w-3 h-3 text-rose-400"/>}
                                        <span
                                            className={
                                                log.status === 'success'
                                                    ? 'text-emerald-400'
                                                    : log.status === 'error'
                                                        ? 'text-rose-400'
                                                        : 'text-slate-400'
                                            }
                                        >
                      {log.message}
                    </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer
                className="border-t border-slate-900 mt-auto py-6 bg-slate-950/80 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400"/>
                        <span>Kreedz Climbing (KZ) Map Manager & Installer</span>
                    </p>
                    <p className="text-slate-600">Built with React 19 & Tailwind CSS</p>
                </div>
            </footer>
        </div>
    );
}
