import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'h-smart-hospital-scene',
  imports: [RouterLink],
  template: ` <div class="hospital-experience" data-mode="static">
    <div
      class="hospital-viewport"
      role="img"
      aria-label="Supplied architectural reference for the proposed Smart Hospital"
    >
      <div class="scene-grid" aria-hidden="true"></div>
      <img
        class="hospital-fallback"
        src="assets/images/smart-hospital.webp"
        alt="Supplied Smart Hospital architectural reference"
        width="810"
        height="965"
        fetchpriority="high"
      />
    </div>
    <div class="hospital-scene-caption">Architectural reference · concept</div>
    <div class="scene-controls">
      <a routerLink="/" fragment="care-network">Explore the cinematic scene ↓</a
      ><a routerLink="/hospital/dashboard">Hospital portal ↗</a>
    </div>
  </div>`,
})
export class SmartHospitalScene {}
