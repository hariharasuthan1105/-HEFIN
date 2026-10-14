import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  GradientButtonComponent,
  StatusBadgeComponent,
  AnimatedTextComponent,
} from '../../shared/components/ui';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { SmartHospitalScene } from '../../three-d/smart-hospital/smart-hospital-scene';
import { AIBrainScene } from '../../three-d/ai-brain/ai-brain-scene';
import { RevealDirective } from '../../shared/directives/reveal.directive';
@Component({
  selector: 'h-home-page',
  imports: [
    RouterLink,
    GradientButtonComponent,
    StatusBadgeComponent,
    AnimatedTextComponent,
    IconComponent,
    SmartHospitalScene,
    AIBrainScene,
    RevealDirective,
  ],
  templateUrl: './home.page.html',
})
export class HomePage {
  step = signal(0);
  milestone = signal(0);
  roles: { path: string; label: string; icon: IconName; description: string; role: string }[] = [
    {
      path: '/patient/dashboard',
      label: 'Patients',
      icon: 'HeartPulse',
      description: 'Your health, checkups and protection in one view.',
      role: 'patient',
    },
    {
      path: '/hospital/dashboard',
      label: 'Hospitals',
      icon: 'Building2',
      description: 'Coordinate care, requests and authorizations.',
      role: 'hospital',
    },
    {
      path: '/insurance/dashboard',
      label: 'Insurers',
      icon: 'ShieldCheck',
      description: 'Clearer policy review. Accountable decisions.',
      role: 'insurance',
    },
    {
      path: '/government/dashboard',
      label: 'Government',
      icon: 'Landmark',
      description: 'Understand program impact through aggregate insights.',
      role: 'government',
    },
  ];
  steps = [
    {
      title: 'Citizen',
      detail: 'A synthetic patient seeks care and shares the necessary information with consent.',
      tag: 'CARE BEGINS WITH A PERSON',
    },
    {
      title: 'Hospital',
      detail:
        'Hospital staff would register the admission, organize documents and submit an emergency assistance request.',
      tag: 'COORDINATE THE NEXT STEP',
    },
    {
      title: 'HEFIN',
      detail:
        'The proposed platform would check eligibility and bring relevant policy information into one review workspace.',
      tag: 'CONNECT CARE AND COVERAGE',
    },
    {
      title: 'Insurer',
      detail:
        'A human reviewer would inspect the policy and supporting documents, then record a decision and its reasons.',
      tag: 'HUMAN REVIEW, ALWAYS',
    },
    {
      title: 'Authorization',
      detail:
        'A simulated authorization would become part of the same claim record and audit history. No funds are transferred.',
      tag: 'A CLEAR DECISION TRAIL',
    },
    {
      title: 'Claim timeline',
      detail:
        'Patient and hospital views would show the same claim status. Government analytics would receive aggregate metrics only.',
      tag: 'EVERYONE ON THE SAME PAGE',
    },
  ];
  milestones = [
    {
      name: 'Prototype',
      phase: '01 / CURRENT',
      description:
        'Design the experience, then connect synthetic data and validate one complete emergency claim journey. Today: frontend and procedural hospital visualization.',
    },
    {
      name: 'Pilot',
      phase: '02 / PROPOSED',
      description:
        'Test usability and operational requirements with consenting participants and prospective partners. No signed partnerships are represented.',
    },
    {
      name: 'Regional expansion',
      phase: '03 / PROPOSED',
      description:
        'Refine the platform around pilot evidence, local healthcare workflows and appropriate approvals.',
    },
    {
      name: 'Nationwide integration',
      phase: '04 / ASPIRATIONAL',
      description:
        'Explore interoperable program connections only after validation. No live government integration is currently available.',
    },
    {
      name: 'International expansion',
      phase: '05 / ASPIRATIONAL',
      description:
        'Evaluate different healthcare and insurance environments after the earlier phases have demonstrated value.',
    },
  ];
}
