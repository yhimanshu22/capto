import { useNavigate } from 'react-router-dom';
import { 
  Play, Video, Sparkles, ArrowRight, 
  Volume2, Share2, PlayCircle, Layers
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-800 relative overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-28 max-w-7xl mx-auto w-full text-center flex flex-col items-center gap-6 z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-violet-750 bg-violet-50 border border-violet-100/50 animate-bounce">
          <Sparkles size={12} />
          <span>Loom Alternative for Teams</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl font-display">
          Show, don't tell.<br />
          Record screen & camera <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">in seconds.</span>
        </h1>

        <p className="text-base md:text-lg text-slate-500 max-w-2xl leading-relaxed font-medium">
          Capto is a free, instant screen and mic recorder. Share ideas faster, collaborate asynchronously, and eliminate unnecessary meetings.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto justify-center">
          <button 
            onClick={() => navigate('/record')} 
            className="px-8 py-4 font-bold text-white bg-violet-600 rounded-2xl hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-base"
          >
            <Video size={20} />
            <span>Start Recording Free</span>
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => navigate('/library')} 
            className="px-8 py-4 font-bold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-base shadow-sm"
          >
            <PlayCircle size={20} className="text-slate-500" />
            <span>Browse Library</span>
          </button>
        </div>
      </section>

      {/* Animated Interactive CSS Mockup */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full z-10">
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden aspect-video group">
          {/* Mock UI Titlebar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3 px-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
            </div>
            <div className="bg-slate-900 rounded-lg px-6 py-1 text-[10px] font-bold text-slate-500 tracking-wide">
              capto.studio/live-capture
            </div>
            <span className="w-3 h-3 opacity-0"></span>
          </div>

          {/* Canvas Simulation Area */}
          <div className="relative bg-slate-900 rounded-2xl flex-1 h-[calc(100%-2.5rem)] flex items-center justify-center overflow-hidden border border-slate-900">
            {/* Background Grid simulation */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>

            {/* Fake Code / Charts interface being recorded */}
            <div className="flex flex-col gap-3 max-w-md w-full p-6 text-left opacity-40 select-none">
              <div className="h-4 bg-violet-500/20 rounded w-3/4"></div>
              <div className="h-3 bg-slate-700/30 rounded w-5/6"></div>
              <div className="h-3 bg-slate-700/30 rounded w-2/3"></div>
              <div className="flex gap-3 mt-2">
                <div className="h-20 bg-pink-500/10 rounded-xl flex-1 border border-pink-500/5"></div>
                <div className="h-20 bg-violet-500/10 rounded-xl flex-1 border border-violet-500/5"></div>
              </div>
            </div>

            {/* Floating Camera Bubble */}
            <div className="absolute bottom-6 left-6 w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-violet-600 bg-slate-800 shadow-2xl flex items-center justify-center overflow-hidden animate-[pulse_3s_infinite] z-20">
              {/* Fake web camera content: avatar init */}
              <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-700 flex flex-col items-center justify-center text-white">
                <span className="text-2xl font-extrabold tracking-wider uppercase font-display">YOU</span>
                <span className="text-[9px] font-bold text-violet-200 mt-0.5 tracking-widest uppercase">Webcam</span>
              </div>
            </div>

            {/* Floating Recording indicator */}
            <div className="absolute top-6 left-6 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white flex items-center gap-1.5 shadow-lg z-20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block"></span>
              <span>REC</span>
              <span className="text-slate-700">|</span>
              <span className="text-emerald-400">01:42</span>
            </div>

            {/* Premium center visual play icon overlay */}
            <div className="absolute bg-violet-600/90 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl opacity-90 hover:opacity-100 hover:scale-105 transition-all cursor-pointer z-30" onClick={() => navigate('/record')}>
              <Play size={26} fill="#fff" className="ml-1" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="bg-white border-y border-slate-100 py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-12">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Built for seamless communication
            </h2>
            <p className="text-sm text-slate-500 font-semibold leading-relaxed">
              Capto combines standard browser Media APIs with our smart custom background rendering framework.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="bg-violet-50 text-violet-600 p-3 rounded-xl w-fit">
                <Layers size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Background Worker Engine</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Never freeze or lag. We offload drawing timers to a background Web Worker so your screen/mic recordings keep capturing smoothly at 30 FPS even when the tab is hidden.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="bg-pink-50 text-pink-600 p-3 rounded-xl w-fit">
                <Volume2 size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Audio Noise Cancellation</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Our backend transcoding toolchain runs custom lowpass, highpass, and FFT noise suppressor filters to cancel cooler whine and loud background fan hums automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl w-fit">
                <Share2 size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Instant MP4 Sharing</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                No raw WebM downloads. The server automatically encodes uploads into universally playable MP4s. Play them back with variable speeds up to 2x or delete them securely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Process Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full z-10 flex flex-col gap-12">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">How it works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="flex flex-col gap-3 text-center items-center">
            <span className="w-10 h-10 rounded-full bg-violet-650 text-white flex items-center justify-center font-bold text-sm shadow-md">1</span>
            <h4 className="text-base font-bold text-slate-800 mt-2">Configure Media</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
              Grant standard screen capture and webcam permissions to link your recording tracks.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col gap-3 text-center items-center">
            <span className="w-10 h-10 rounded-full bg-violet-650 text-white flex items-center justify-center font-bold text-sm shadow-md">2</span>
            <h4 className="text-base font-bold text-slate-800 mt-2">Capture Studio</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
              Record your screen, voice, and camera overlay. Background timers ensure consistent framing.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col gap-3 text-center items-center">
            <span className="w-10 h-10 rounded-full bg-violet-650 text-white flex items-center justify-center font-bold text-sm shadow-md">3</span>
            <h4 className="text-base font-bold text-slate-800 mt-2">Instant URL</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
              Stop sharing to automatically transcode and generate a watch link. Copy, share, and review.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full z-10">
        <div className="bg-gradient-to-tr from-violet-600 to-indigo-850 rounded-3xl p-8 md:p-12 text-center text-white shadow-xl flex flex-col items-center gap-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20"></div>
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight font-display z-10">Ready to capture your screen?</h3>
          <p className="text-xs md:text-sm text-violet-100 max-w-md z-10 leading-relaxed font-medium">
            Join thousands of professionals who communicate visually. Completely local, free, and instantly shareable.
          </p>
          <button 
            onClick={() => navigate('/record')} 
            className="mt-2 px-8 py-4 bg-white text-violet-750 font-bold rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer text-base shadow-lg z-10 flex items-center gap-1.5"
          >
            <span>Record My First Video</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

    </div>
  );
}
