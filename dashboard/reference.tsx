<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>GPR Intelligence | Institutional Risk Platform</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#60a5fa",
                        "background-light": "#f5f7f8",
                        "background-dark": "#020617",
                        "slate-950": "#020617",
                    },
                    fontFamily: {
                        "display": ["Montserrat", "sans-serif"],
                        "sans": ["Montserrat", "sans-serif"],
                        "mono": ["Montserrat", "monospace"]
                    },
                    borderRadius: {
                        "DEFAULT": "0px",
                        "lg": "0px",
                        "xl": "0px",
                        "full": "9999px"
                    },
                },
            },
        }
    </script>
<style type="text/tailwindcss">
        body { font-family: 'Montserrat', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .border-active-blue { border-left: 2px solid #60a5fa; }
        .border-active-rose { border-left: 2px solid #f43f5e; }
        .border-active-emerald { border-left: 2px solid #10b981; }.stat-value {
            font-weight: 900;
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased overflow-hidden font-display">
<div class="flex h-screen w-full">
<aside class="w-64 border-r border-slate-800 flex flex-col bg-slate-950">
<div class="p-6">
<div class="flex flex-col mb-10">
<h1 class="text-amber-500 text-xl font-black tracking-tighter">GPR</h1>
<p class="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-extrabold">INTELLIGENCE</p>
</div>
<nav class="space-y-1">
<a class="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">monitor_heart</span>
<span class="text-[11px] font-semibold uppercase tracking-wider">Event Monitor</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">factory</span>
<span class="text-[11px] font-semibold uppercase tracking-wider">Industry Impact</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
<span class="text-[11px] font-semibold uppercase tracking-wider">Holdings</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 text-primary border-l-2 border-primary bg-primary/5" href="#">
<span class="material-symbols-outlined text-[20px]">psychology</span>
<span class="text-[11px] font-extrabold uppercase tracking-wider">Agent Intelligence</span>
</a>
</nav>
</div>
<div class="mt-auto p-6 border-t border-slate-800/50">
<div class="flex flex-col gap-1">
<p class="text-slate-300 text-xs font-bold">iShares LCTD</p>
<p class="text-slate-500 text-[10px] font-medium tracking-tight">2025-06-23</p>
<p class="text-slate-500 text-[10px] font-medium uppercase mt-1 tracking-tight">v2.1 Build 9942</p>
</div>
</div>
</aside>
<main class="flex-1 flex flex-col overflow-hidden">
<header class="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950">
<div class="flex items-center gap-4">
<h2 class="text-[#f8fafc] text-sm font-extrabold uppercase tracking-wide">iShares LCTD</h2>
<div class="flex items-center gap-2 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-sm">
<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
<span class="text-rose-400 text-[10px] font-black uppercase tracking-widest">Extreme Spike</span>
</div>
</div>
<div class="flex items-center gap-4">
<span class="text-slate-400 text-[10px] font-medium tracking-tight">LAST_UPDATE: 2025-06-23 08:42:11 UTC</span>
<button class="material-symbols-outlined text-slate-400 hover:text-white text-[20px]">settings</button>
</div>
</header>
<div class="flex border-b border-slate-800 bg-slate-950/50 px-6">
<button class="flex items-center gap-2 py-3 border-b-2 border-primary text-white mr-8">
<span class="text-xs font-extrabold uppercase tracking-widest">Threat Clusters</span>
<span class="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold">4</span>
</button>
<button class="flex items-center gap-2 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-300 transition-colors mr-8">
<span class="text-xs font-bold uppercase tracking-widest">Watchlist</span>
<span class="px-1.5 py-0.5 bg-slate-800/50 text-slate-500 text-[10px] font-bold">5</span>
</button>
<button class="flex items-center gap-2 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-300 transition-colors">
<span class="text-xs font-bold uppercase tracking-widest">Deep Dive</span>
<span class="px-1.5 py-0.5 bg-slate-800/50 text-slate-500 text-[10px] font-bold">111</span>
</button>
</div>
<div class="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-950 no-scrollbar">
<div class="bg-slate-900 border border-slate-800 flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors">
<div class="flex items-center gap-4">
<span class="text-white text-sm font-bold tracking-tight uppercase">Iran Escalation</span>
<span class="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-black uppercase tracking-tighter">Critical</span>
</div>
<span class="material-symbols-outlined text-slate-500">add</span>
</div>
<div class="bg-slate-900 border border-slate-800 flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors">
<div class="flex items-center gap-4">
<span class="text-white text-sm font-bold tracking-tight uppercase">Terror Advisories</span>
<span class="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase tracking-tighter">Moderate</span>
</div>
<span class="material-symbols-outlined text-slate-500">add</span>
</div>
<div class="bg-slate-900 border border-slate-800 flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors">
<div class="flex items-center gap-4">
<span class="text-white text-sm font-bold tracking-tight uppercase">Wider Theatre Escalation</span>
<span class="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-black uppercase tracking-tighter">Critical</span>
</div>
<span class="material-symbols-outlined text-slate-500">add</span>
</div>
<div class="bg-slate-900 border border-slate-800 border-active-blue flex flex-col overflow-hidden">
<div class="flex items-center justify-between p-4 border-b border-slate-800">
<div class="flex items-center gap-4">
<span class="text-white text-sm font-extrabold tracking-tight uppercase">UN Security Council Scrutiny</span>
<span class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-tighter">Resilient</span>
</div>
<span class="material-symbols-outlined text-slate-500">remove</span>
</div>
<div class="p-0 flex flex-col">
<div class="grid grid-cols-3 border-b border-slate-800">
<div class="p-6 flex flex-col border-r border-slate-800">
<span class="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">Economic Channels</span>
<span class="text-white text-4xl stat-value">2</span>
</div>
<div class="p-6 flex flex-col border-r border-slate-800">
<span class="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">Industries Affected</span>
<span class="text-white text-4xl stat-value">5</span>
</div>
<div class="p-6 flex flex-col">
<span class="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">Evidence Found</span>
<span class="text-white text-4xl stat-value">0</span>
</div>
</div>
<div class="px-6 py-4 flex items-center gap-6 border-b border-slate-800">
<span class="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Actors</span>
<div class="flex gap-2">
<span class="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-tighter">US (Federal)</span>
<span class="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-tighter">UN (Security Council)</span>
<span class="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-tighter">E3 (European Union)</span>
</div>
</div>
<div class="px-6 py-3 flex items-center gap-4 border-b border-slate-800">
<span class="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Timeline</span>
<div class="flex-1 flex items-center gap-3">
<span class="text-slate-400 text-[10px] font-bold">2025-06-21</span>
<div class="flex-1 h-[1px] bg-slate-800 relative">
<div class="absolute inset-x-0 -top-3 flex justify-center">
<span class="text-slate-500 text-[11px] font-bold bg-slate-900 px-2 tracking-tighter">2 days duration</span>
</div>
</div>
<span class="text-slate-400 text-[10px] font-bold">2025-06-23</span>
</div>
</div>
<div class="p-6 space-y-8">
<div>
<div class="flex items-center gap-4 mb-3">
<span class="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-primary text-[10px] font-black uppercase tracking-widest">Diplomatic Sanctions</span>
<p class="text-slate-400 text-sm font-medium italic">High likelihood of multi-lateral trade freezes affecting specific industrial supply chains.</p>
</div>
<div class="ml-4 space-y-4">
<div class="border-active-rose pl-4 py-1">
<div class="flex items-center gap-2 mb-1">
<span class="text-slate-500 text-xs font-bold">01.</span>
<h4 class="text-white text-sm font-extrabold uppercase tracking-tight">Machinery</h4>
</div>
<p class="text-slate-400 text-xs font-medium leading-relaxed max-w-2xl">Vulnerability detected in heavy equipment exports. 14.2% projected volatility in core production components due to component embargo protocols.</p>
</div>
<div class="border-active-rose pl-4 py-1">
<div class="flex items-center gap-2 mb-1">
<span class="text-slate-500 text-xs font-bold">02.</span>
<h4 class="text-white text-sm font-extrabold uppercase tracking-tight">Petroleum and Natural Gas</h4>
</div>
<p class="text-slate-400 text-xs font-medium leading-relaxed max-w-2xl">Channel constraints in refining capacity. Supply chain routing expected to shift towards premium alternative providers within 72 hours.</p>
</div>
</div>
</div>
<div>
<div class="flex items-center gap-4 mb-3">
<span class="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-primary text-[10px] font-black uppercase tracking-widest">Macro Demand Confidence</span>
<p class="text-slate-400 text-sm font-medium italic">Institutional sentiment remains resilient despite regional geopolitical compression.</p>
</div>
<div class="ml-4 space-y-4">
<div class="border-active-emerald pl-4 py-1">
<div class="flex items-center gap-2 mb-1">
<span class="text-slate-500 text-xs font-bold">03.</span>
<h4 class="text-white text-sm font-extrabold uppercase tracking-tight">Financial Services</h4>
</div>
<p class="text-slate-400 text-xs font-medium leading-relaxed max-w-2xl">High resilience observed. Liquidity buffers in the LCTD fund provide significant insulation against localized currency fluctuations.</p>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</main>
<aside class="w-80 border-l border-slate-800 bg-slate-950 flex flex-col">
<div class="p-6 border-b border-slate-800">
<h3 class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Geospatial Intelligence</h3>
<div class="aspect-video bg-slate-900 border border-slate-800 overflow-hidden relative group">
<img alt="Satellite view" class="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCtKhf6av17-kkK8Akr5Xh-RRnivLu1ELsG82JJMuqgbnrDS4StrrFtf0tpwAWBoegzL-0srK5VyhdEy9Pdnb2njOigjxYvhMX_CVy_i_hv60r5ytvPliOrfQDRXTou9iW2vvJYO4SdAp7rxc3FUaix0khP3IwZpT142KGLvSuwC9LxfqKzGjkouklsdWcCiyjfg5OFrUYyqRhFQPxU2GKbIn9ingXO2MBrsYiCUAV-WDTuOJAD2DLRX-abnvYRBPzzWIobi_Hz8bD"/>
<div class="absolute inset-0 bg-blue-500/10 pointer-events-none"></div>
<div class="absolute inset-0 flex items-center justify-center">
<div class="w-12 h-12 border border-primary/40 flex items-center justify-center">
<div class="w-1 h-1 bg-primary"></div>
</div>
</div>
</div>
</div>
<div class="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
<div>
<h4 class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Active Agents</h4>
<div class="space-y-2">
<div class="flex items-center justify-between text-[10px] font-bold">
<span class="text-slate-300">AGENT_ALPHA_01</span>
<span class="text-emerald-500 uppercase font-black">Processing</span>
</div>
<div class="w-full h-1 bg-slate-900">
<div class="w-3/4 h-full bg-primary/40"></div>
</div>
<div class="flex items-center justify-between text-[10px] font-bold">
<span class="text-slate-300">AGENT_SIGMA_09</span>
<span class="text-slate-500 uppercase">Idle</span>
</div>
<div class="w-full h-1 bg-slate-900">
<div class="w-1/4 h-full bg-slate-700"></div>
</div>
</div>
</div>
<div>
<h4 class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Live Signal Feed</h4>
<div class="space-y-3">
<div class="border-l border-slate-800 pl-3">
<p class="text-slate-500 text-[10px] font-bold mb-1">08:41:02</p>
<p class="text-slate-300 text-[11px] leading-tight font-extrabold uppercase">Embargo protocols updated for Region VII</p>
</div>
<div class="border-l border-slate-800 pl-3">
<p class="text-slate-500 text-[10px] font-bold mb-1">08:39:44</p>
<p class="text-slate-300 text-[11px] leading-tight font-extrabold uppercase">Machinery export volatility spike detected</p>
</div>
<div class="border-l border-rose-500 pl-3">
<p class="text-rose-500 text-[10px] font-black mb-1">08:35:12</p>
<p class="text-white text-[11px] leading-tight font-black uppercase">Critical vulnerability: SC Security Council Scrutiny</p>
</div>
</div>
</div>
</div>
</aside>
</div>
</body></html>