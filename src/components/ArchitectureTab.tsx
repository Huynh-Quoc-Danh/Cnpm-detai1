import React from 'react';
import { ThreeLayerLog, MicroserviceEvent, LanguageCode } from '../types';

interface ArchitectureTabProps {
  lang: LanguageCode;
  threeLayerLogs: ThreeLayerLog[];
  microserviceEvents: MicroserviceEvent[];
  onTriggerTestPipeline: () => void;
}

export const ArchitectureTab: React.FC<ArchitectureTabProps> = ({
  lang,
  threeLayerLogs,
  microserviceEvents,
  onTriggerTestPipeline
}) => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header giới thiệu đề tài theo đúng Slide */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              ĐỀ TÀI ĐỒ ÁN MÔN HỌC • GITHUB CI/CD WORKFLOW
            </span>
            <h2 className="text-xl md:text-2xl font-extrabold">
              Thuyết Minh Tự Động Đa Ngôn Ngữ (Full-Stack Architecture)
            </h2>
            <p className="text-xs text-slate-300">
              Mô hình kết hợp FE (React.js + React Native), BE 3 Lớp (3-Tier) và Microservices giao tiếp thời gian thực.
            </p>
          </div>
          <button
            onClick={onTriggerTestPipeline}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <i className="fa-solid fa-play"></i>
            <span>Chạy thử luồng Request 3 Lớp & Microservices</span>
          </button>
        </div>

        {/* 3 Trụ cột phân công nhóm 2 - 3 Sinh Viên */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-sky-400">1. FE DEV (WEB & MOBILE)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">CI/CD Passing</span>
            </div>
            <p className="text-xs text-slate-200 font-semibold">
              React Native + React.js (.tsx)
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Xử lý giao diện thích ứng đa thiết bị (Web Desktop & Mobile View), bản đồ số Leaflet GPS, Web Speech API sóng âm đa ngôn ngữ.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-400">2. BE DEV (KIẾN TRÚC 3 LỚP)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">CI/CD Passing</span>
            </div>
            <p className="text-xs text-slate-200 font-semibold">
              Controller $\rightarrow$ BLL $\rightarrow$ DAL
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tách biệt rõ tầng Giao tiếp API (Controller), tầng Nghiệp vụ Haversine GPS & Vé (BLL) và tầng Truy xuất dữ liệu (Repository DAL).
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-400">3. BE DEV (MICROSERVICES)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">CI/CD Passing</span>
            </div>
            <p className="text-xs text-slate-200 font-semibold">
              Inter-Service Communication
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Các Services độc lập (`Geo-Service`, `TTS-Audio`, `Ticketing-Payoo`, `AI-RAG`) giao tiếp qua REST, gRPC và RabbitMQ Event Bus.
            </p>
          </div>
        </div>
      </div>

      {/* Sơ đồ luồng giao tiếp Microservices & 3-Layer trực quan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bảng 1: Live Trace BE 3 Lớp */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-amber-600"></i>
                <span>Live Trace: Kiến Trúc Backend 3 Lớp (3-Tier)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Mọi thao tác trên web tự động ghi log luồng chạy qua Controller $\rightarrow$ BLL $\rightarrow$ DAL
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {threeLayerLogs.length} requests
            </span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {threeLayerLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-700">{log.action}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {log.status} • {log.latencyMs}ms
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 space-y-1 pl-2 border-l-2 border-amber-400">
                  <div>
                    <strong className="text-indigo-600">[1. Controller]:</strong> {log.controllerLayer}
                  </div>
                  <div>
                    <strong className="text-amber-600">[2. BLL Service]:</strong> {log.businessLayer}
                  </div>
                  <div>
                    <strong className="text-emerald-600">[3. DAL Repo]:</strong> {log.dataAccessLayer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bảng 2: Giao tiếp giữa các Microservices */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <i className="fa-solid fa-diagram-project text-purple-600"></i>
                <span>Microservices Inter-Communication Bus</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Giao tiếp bất đồng bộ giữa Geo-Service, TTS-Audio, Ticketing và AI-RAG
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {microserviceEvents.length} events
            </span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {microserviceEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-2xl bg-slate-900 text-slate-100 text-xs space-y-1.5 font-mono"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-300 font-bold">
                    {evt.sourceService} <i className="fa-solid fa-arrow-right mx-1 text-slate-400"></i> {evt.targetService}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[10px]">
                    {evt.protocol}
                  </span>
                </div>
                <div className="text-sky-300 font-bold">{evt.eventName}</div>
                <div className="text-[11px] text-slate-400">{evt.payloadSummary}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tiến độ Đồ án (Tuần 7 Giữa kỳ & Tuần 11, 12 Cuối kỳ) & GitHub CI/CD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <i className="fa-brands fa-github text-slate-900 text-lg"></i>
            <span>Quản Lý Tiến Độ Đồ Án (Nhóm 2 – 3 SV) & GitHub Actions CI/CD</span>
          </h3>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            ● Pipeline: main branch deployed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sky-900">MỐC 1: TUẦN 7 - KIỂM TRA TIẾN ĐỘ GIỮA KỲ</span>
              <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-bold text-[10px]">Hoàn thành 100%</span>
            </div>
            <ul className="space-y-1 text-slate-700">
              <li>✔ Khởi tạo GitHub Repository nhóm (2-3 SV), phân nhánh `fe-dev`, `be-3layer`, `be-microservices`.</li>
              <li>✔ Hoàn thiện giao diện FE React.js (.tsx) + Chế độ Mobile Responsive.</li>
              <li>✔ Xây dựng đầy đủ tầng Controller - BLL - DAL và dữ liệu 7 danh thắng Vịnh Hạ Long.</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-indigo-900">MỐC 2: TUẦN 11, 12 - BÁO CÁO CUỐI KỲ</span>
              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px]">Sẵn sàng</span>
            </div>
            <ul className="space-y-1 text-slate-700">
              <li>✔ Tích hợp giao tiếp liên Services (Geo Geofencing tự động gọi TTS Audio & AI RAG).</li>
              <li>✔ Thiết lập GitHub Actions CI/CD tự động Build, Test & Deploy (`.github/workflows/ci-cd.yml`).</li>
              <li>✔ Hoàn thiện báo cáo tổng kết và kịch bản Demo trực tiếp trên lớp.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};