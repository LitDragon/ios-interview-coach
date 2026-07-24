# Xiaolong Su

**Senior iOS Engineer**

Guangzhou, China | +86 15322059092 | 873098673@qq.com  
Eligible to work in Hong Kong under a dependant visa; no employer sponsorship required  
Available to relocate to Hong Kong after accepting an offer

## Professional Summary

Senior iOS engineer with 10 years of experience delivering consumer, smart-device, real-time media, social audio and financial applications. Strong production background in Objective-C, UIKit and complex legacy-system maintenance. Experienced in tracing issues across application, media SDK and device-protocol boundaries, with hands-on work in WebRTC, RTSP, H.264, Metal rendering, playback, recording, device control, automated testing and CI/CD. Previously delivered modules for HSBC's Hong Kong personal banking application, including VIPER-based development, accessibility, localization and test automation.

## Core Skills

- **Languages:** Objective-C, Objective-C++, Swift (working knowledge), C
- **iOS:** UIKit, Foundation, AVFoundation, AVAudioSession, Core Data, SQLite, Auto Layout
- **Media and Devices:** WebRTC, RTSP, FFmpeg, Metal, H.264, RTP, MP4 recording, smart-camera control
- **Networking:** URLSession, AFNetworking, SocketRocket, DataChannel, UDP/TCP, device command and response parsing
- **Architecture and Delivery:** VIPER, MVC, MVVM, modularization, CocoaPods, XCFramework integration, Git
- **Quality:** XCTest, UI testing, Instruments, crash analysis, Jenkins CI/CD, code review, device testing

## Professional Experience

### Senior iOS Engineer — Guangzhou Qiangui IoT Technology Co., Ltd.

**June 2024 – Present | Guangzhou, China**

- Own core iOS development and maintenance for the V720 smart-camera application, covering real-time preview, WebRTC live streaming, device control, SD-card playback, screenshots, recording and file downloads.
- Stabilized live-to-playback transitions across the application and media layers by defining lifecycle and request ownership, gating presentation on the first decoded video frame, and suppressing cancelled or late callbacks.
- Diagnosed an AP-mode protocol crash caused by a G-sensor payload shorter than the three required `int16_t` fields; added a consumer-side length guard and focused regression coverage for 1–5-byte malformed payloads and the valid 6-byte boundary.
- Integrated a static NanoRTSP XCFramework for iOS device and simulator targets, updating public headers, module maps, imports, and Xcode link/embed settings while preserving the application-facing media contract.
- Migrated real-time preview rendering from per-frame `UIImage`/`UIImageView` updates to Metal-based rendering, reducing main-thread image conversion and rendering work under comparable preview conditions.
- Resolved recording-dimension propagation and download-state ownership issues, preventing unrelated tasks or pages from overwriting active media state.

### Senior iOS Engineer — Infosys Limited

**May 2021 – May 2024 | Guangzhou, China**

- Developed and maintained Contact Details and related modules for HSBC's personal banking iOS application using the team's VIPER architecture and regulated delivery process.
- Implemented configurable phone-number and email validation flows, including region-specific rules, error priority and safe fallback behaviour.
- Delivered Traditional Chinese and English localization, VoiceOver accessibility, dynamic text and multi-environment release support for Hong Kong banking users.
- Added and maintained XCTest and UI test coverage, participated in code review, and supported Jenkins-based continuous integration and regression workflows.
- Integrated Tealium analytics for key user actions in contact-information update flows.

### Earlier iOS Engineer Roles

**January 2021 – April 2021 — Guangzhou Honglue Information Technology Co., Ltd.**  
**June 2019 – November 2020 — Huobaobao Network Technology Co., Ltd.**  
**November 2017 – April 2019 — Lejiatao Network Technology Co., Ltd.**  
**June 2016 – October 2017 — Guangzhou Jingao Information Technology Co., Ltd.**

- Delivered iOS features for B2B ERP, e-commerce, social audio/video and smart-device recycling products, including authentication, payments, local caching, weak-network synchronization, media playback, interaction animation and multi-device adaptation.
- Built reusable UIKit, networking and persistence components and contributed to application maintenance, release delivery, defect investigation and code review.

## Education

**Northwestern Polytechnical University**  
Bachelor's Degree in Computer Science and Technology (part-time), September 2019 – June 2022

## Languages

Cantonese (fluent) | Mandarin Chinese (native) | English (basic working proficiency)
