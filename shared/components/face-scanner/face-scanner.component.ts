import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { rejects } from 'assert';
import { resolve } from 'path';
import { Subject, takeUntil } from 'rxjs';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { FaceAuthProxyRegister, FaceAuthProxyVerify, FaceTechProxyDelete, SaveLivenessEnrollment } from 'src/app/constants/constants';
import { RoutesObj } from 'src/app/routes.config';
  import {
	CommonService,
	EnrollDataType
  } from 'src/app/services/common/common.service';
  import { StorageService } from 'src/app/storageService/storage-service';
  import { environment } from 'src/environments/environment';
  import { v4 as uuidv4 } from 'uuid';

  @Component({
	selector: 'app-face-scanner',
	templateUrl: './face-scanner.component.html',
	styleUrls: ['./face-scanner.component.css'],
  })
  export class FaceScannerComponent
	implements OnInit, OnDestroy, AfterViewInit
  {
	@ViewChild('videoElement', { static: false })
	videoElement!: ElementRef<HTMLVideoElement>;
	@ViewChild('canvas', { static: false })
	canvas!: ElementRef<HTMLCanvasElement>;
	@ViewChild('progressPath', { static: false }) progressPath!: ElementRef<SVGGeometryElement>;

	videoStream: MediaStream | null = null;
	isDisplayErrorMsg: boolean = false;
	errorMessage: string = '';
	destroy$ = new Subject<void>();
	isFaceEnrollment: boolean = false;
	isFaceVerification: boolean = false;

	countdownText: string = '';
	showCountdown: boolean = false;
	showProcessing: boolean = false;

	constructor(
	  private storage: StorageService,
	  private api: HelperModuleService,
	  private common: CommonService,
	  private router: Router
	) {}

	ngAfterViewInit(): void {
	  this.openCamera();
	  this.resetProgress();

	}

	ngOnInit(): void {
	  this.common.updateCameraView
		.pipe(takeUntil(this.destroy$))
		.subscribe((res: EnrollDataType) => {
		  if (res && Object.keys(res).length > 0) {
			this.isFaceEnrollment = res.isEnrollFace || false;
			this.isFaceVerification = res.isVerifyFace || false;
		  }
		});
		this.resetProgress();
		setTimeout(() => {
		  this.startOvalProgress();
		},100);

	}

	ngOnDestroy(): void {
	  this.common.openEnrollCamera({});
	  if (this.videoStream) {
		this.videoStream.getTracks().forEach((track) => track.stop());
	  }
	  this.resetProgress();
	}

	openCamera() {
	  navigator.mediaDevices
		.getUserMedia({ video: true })
		.then((stream) => {
		  setTimeout(() => {
			if (this.videoElement) {
			  this.videoStream = stream;
			  this.videoElement.nativeElement.srcObject = stream;
			}
		  }, 50);

		  // Start countdown before capture
		  this.startCountdown().then(() => {
			 this.capture();
		  });
		})
		.catch((error) => {
		  console.error('Camera access error:', error);
		  this.isDisplayErrorMsg = true;
		  this.errorMessage =
			'Unable to access the camera. Please ensure it is connected and permissions are granted.';
		});
	}

	async startCountdown(): Promise<void> {
		this.showCountdown = true;
		this.showProcessing = false;

		const countdownSequence = ['3', '2', '1'];

		for (const value of countdownSequence) {
			this.countdownText = value;
			await this.delay(1000); // Wait 1 second for each countdown number
		}

		this.countdownText = 'Processing...';
		this.showCountdown = false;
		this.showProcessing = true;

		await this.delay(1000); // Show "Processing..." for 1 second
	}

	delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	async capture() {
	  const video = this.videoElement.nativeElement;
	  const canvas = this.canvas.nativeElement;
	  const context = canvas.getContext('2d');

	  canvas.width = video.videoWidth;
	  canvas.height = video.videoHeight;

	  context?.drawImage(video, 0, 0, canvas.width, canvas.height);

	  const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
		  if (blob) resolve(blob);
		  else reject(new Error('Failed to create blob'));
		}, 'image/jpeg', 0.9);
	  });

	  const user_Id = localStorage.getItem('UserId') || '';
	  const site_code = localStorage.getItem('SiteCode') || '';
	  const key = `${user_Id}_${site_code}_${environment.Instance}`;
	  const unique_id = uuidv4();

	  const formData = new FormData();

	  if (this.isFaceEnrollment && !this.isFaceVerification) {
		formData.append('uid', key);
		formData.append('email', user_Id);
		formData.append('files', blob);
		this.enrollmentProcess(formData);
	  } else if (this.isFaceVerification && !this.isFaceEnrollment) {
		formData.append('uid', key);
		formData.append('file', blob);
		formData.append('VerifyLogId', unique_id);
		this.storage.setSessionStorage('FVSessionKey', unique_id);
		this.verificationProcess(formData);
	  }
	}

	reCapture() {
	  this.isDisplayErrorMsg = false;
	  this.errorMessage = '';
	  this.openCamera();
	}

	enrollmentProcess(formData: any) {
	  this.api.postService(FaceAuthProxyRegister, formData).subscribe({
		next: (res: any) => {
		  if (res.Status && res.Status?.toLowerCase() == 'error') {
			this.showProcessing = false;
			this.isDisplayErrorMsg = true;
			this.errorMessage = res.ReturnMessage;
			if (this.videoStream) {
			  this.videoStream.getTracks().forEach((track) => track.stop());
			}
		  } else {
			this.isDisplayErrorMsg = false;
			this.SaveLivenessEnrollment();
		  }
		},
		error: (err: any) => {
		  console.log(err);
		  this.showProcessing = false;
		  this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage("Unable to complete face enrollment. Please try again");
		},
	  });
	}

	verificationProcess(formData: any) {
	  this.api.postService(FaceAuthProxyVerify, formData).subscribe({
		next: (res: any) => {
		  if (res.Status && res.Status?.toLowerCase() == 'error') {
			this.showProcessing = false;
			this.isDisplayErrorMsg = true;
			this.errorMessage = res.ReturnMessage;
			if (this.videoStream) {
			  this.videoStream.getTracks().forEach((track) => track.stop());
			}
		  } else {
			this.isDisplayErrorMsg = false;
			this.common.verifyFaceSuccess(true);
			this.common.openEnrollCamera({});
		  }
		},
		error: (err: any) => {
		  this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage("Unable to verify your face. Please try again");
		  this.showProcessing = false;
		},
	  });
	}

	SaveLivenessEnrollment() {
    let user_Id = localStorage.getItem('UserId') || '';
    let site_code = localStorage.getItem('SiteCode') || '';
    let req = {
        "LivenessKey": `${user_Id}_${site_code}_${environment.Instance}`
    };

    this.api.postService(SaveLivenessEnrollment, req).subscribe({
        next: (res: any) => {
			this.showProcessing = false;
            if (res && res.ReturnCode == 0) {
                this.router.navigate([`/HRMS${RoutesObj.employeeProfile}`]);
            } else {
				this.isDisplayErrorMsg = true;
				this.errorMessage = res.ReturnMessage;
				let request = {
					uid:req.LivenessKey
				}

                this.deleteLivenessEnrollment(request , res?.ReturnMessage);
            }
        },
        error: (err) => {
			this.showProcessing = false;
			let request = {
					uid:req.LivenessKey
				}
            console.error('Error during SaveLivenessEnrollment:', err);
            this.deleteLivenessEnrollment(request , 'An unexpected error occurred during enrollment.');
        }
    });
}

deleteLivenessEnrollment(req: any, fallbackMessage: string) {
    this.api.postService(FaceTechProxyDelete , req).subscribe({
        next: (deleteRes: any) => {
            this.isDisplayErrorMsg = true;
            this.errorMessage = fallbackMessage || 'Enrollment failed.';
        },
        error: (deleteErr) => {
            console.error('Error while deleting liveness enrollment:', deleteErr);
            this.isDisplayErrorMsg = true;
            this.errorMessage = 'Enrollment failed, and cleanup also failed.';
        }
    });
}

	close() {
	  this.common.openEnrollCamera({});
	  this.resetProgress();
	}
	private startOvalProgress(): void {
		const pathEl = this.progressPath.nativeElement;
		const pathLength = pathEl.getTotalLength();

		pathEl.style.strokeDasharray = `${pathLength}`;
		pathEl.style.strokeDashoffset = `${pathLength}`;

		let current = 0;

		const interval = setInterval(() => {
		  current += 1;
		  if (current > 100) {
			clearInterval(interval);
		  } else {
			const offset = pathLength - (current / 100) * pathLength;
			pathEl.style.strokeDashoffset = `${offset}`;
		  }
		}, 30); // 50ms per frame (~5 seconds total)
	  }

	  private resetProgress(): void {
		if (!this.progressPath) return;

		const pathEl = this.progressPath.nativeElement;
		const pathLength = pathEl.getTotalLength();

		pathEl.style.strokeDasharray = `${pathLength}`;
		pathEl.style.strokeDashoffset = `${pathLength}`;
	  }
  }

