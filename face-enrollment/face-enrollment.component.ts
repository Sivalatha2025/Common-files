import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { SampleApp } from "../../../assets/FaceTecAngularSampleApp/src/sampleAppController";
import { Subject, takeUntil } from 'rxjs';
import { sharedUserStore } from 'src/app/shared/shared-sidebar.store';
import { CommonService, EnrollDataType } from 'src/app/services/common/common.service';
import { StorageService } from 'src/app/storageService/storage-service';
import { EnrollmentProcessor } from "../../../assets/FaceTecAngularSampleApp/src/processors/EnrollmentProcessor";
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { CheckLivenessEnrollment, RootEnum } from 'src/app/constants/constants';
import { isPlatformBrowser } from '@angular/common';
import { CustomTranslatePipe } from 'src/app/shared/pipes/custom-translate.pipe';
import { MultilanguageService } from 'src/app/services/multilanguage.service';
import { Router } from '@angular/router';
declare var $: any;

@Component({
	selector: 'app-face-enrollment',
	templateUrl: './face-enrollment.component.html',
	styleUrls: ['./face-enrollment.component.css']
})
export class FaceEnrollmentComponent implements OnInit, OnDestroy {
	destroy$ = new Subject<void>();
	UserSettingsInfo: any;
	IsFaceEnrollEnabled: boolean = false;
	IsAlreadyEnrolled: boolean = true;
	isLoading: boolean = false;
	changedetect: boolean = false;
	root: string = RootEnum.Common;
	statusMessage: string = '';
	isDisplayCustomScanner: boolean = false;

	constructor(private common: CommonService, private storage: StorageService, private api: HelperModuleService,
		@Inject(PLATFORM_ID) private platformId: any,
		private customTranslatePipe: CustomTranslatePipe,
		private multiLanguageService: MultilanguageService,
		private Router: Router

	) { }

	/**
   * @author Ravikiran
   * @description Cleanup logic when the component is destroyed.
   * 
   * This lifecycle method ensures proper cleanup of resources:
   * 1. Emits a value to `destroy$` to signal completion of any active subscriptions.
   * 2. Completes the `destroy$` observable to prevent memory leaks.
   * 3. Deletes the 'SiteCode' key from local storage to remove session-specific data.
   * 
   * This helps maintain application performance and avoid potential memory issues.
   */
	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
		// this.storage.deleteLocalStorage('SiteCode');
		this.common.openEnrollCamera({});
	}

	/**
   * @author Ravikiran
   * @description Lifecycle hook that runs when the component initializes.
   * 
   * This method:
   * 1. Checks if the code is running in a browser environment before calling `checkEnroll()`.
   * 2. Subscribes to language updates from `multiLanguageService`, triggering change detection when the language changes.
   * 3. Ensures proper subscription cleanup using `takeUntil(this.destroy$)`.
   */
	ngOnInit(): void {

		if (isPlatformBrowser(this.platformId)) {
			//  this.checkEnroll()

		}

		this.common.updateuserSettings
			.pipe(takeUntil(this.destroy$))
			.subscribe((res: any) => {
				if (res) {
					
					if (res.UserSetting.IsLivenessEnable && res.UserSetting.FaceAuthProvider && res.UserSetting.FaceAuthProvider?.toLowerCase() == 'facetec') {
						this.isDisplayCustomScanner = false;
						setTimeout(() => {
							if ($('#display-box-container').hasClass('hide-box-container')) {
								$('#display-box-container').removeClass('hide-box-container')
								$('#display-box-container').addClass('display-box-container')
							}
						}, 10)

					} else {
						$('#display-box-container').hide();
						this.isDisplayCustomScanner = true;
					}
					this.checkEnroll()
				}
			})

		this.multiLanguageService.selectedLanguageUpdation()
			.pipe(takeUntil(this.destroy$))
			.subscribe(() => {

				this.changedetect = !this.changedetect;
			});

	}

	/**
   * @author Biswajit
   * @description Checks if the user is already enrolled in liveness detection by making an API request.
   *              If the user is enrolled, it updates the UI by hiding the display box container.
   *              If not enrolled, it updates the enrollment status accordingly.
   *              Regardless of the result, it fetches user settings data.
   * 
   * @returns {void}
   */
	checkEnroll() {
		this.api.postService(CheckLivenessEnrollment, {}).subscribe({
			next: (res: any) => {
				this.isLoading = false;

				if (res && res.Data) {
					
					if (res.Data.IsRejected) {           //Case1 : if Rejected then display the Enrollment.
						this.IsAlreadyEnrolled = false;
						this.statusMessage = res.Data.Message;
						if (!this.isDisplayCustomScanner) {
							setTimeout(() => {
								if ($('#display-box-container').hasClass('hide-box-container')) {
									$('#display-box-container').removeClass('hide-box-container')
									$('#display-box-container').addClass('display-box-container')
								}
							}, 10);

						} else {
							setTimeout(() => {
								if (($('#display-box-container').hasClass('display-box-container'))) {
									$('#display-box-container').removeClass('display-box-container')
								}
							}, 10)
						}
					} else if (res.Data.Message) {    //Case2 : if not rejected and the process in pending state then display the Message.
						this.IsAlreadyEnrolled = true;
						this.statusMessage = res.Data.Message;
						if (!this.isDisplayCustomScanner) {
							if (!($('#display-box-container').hasClass('hide-box-container'))) {
								$('#display-box-container').addClass('hide-box-container')
							}
							if (($('#display-box-container').hasClass('display-box-container'))) {
								$('#display-box-container').removeClass('display-box-container')
							}
						} else {
							setTimeout(() => {
								if (($('#display-box-container').hasClass('display-box-container'))) {
									$('#display-box-container').removeClass('display-box-container')
								}
							}, 10)
						}
					} else {                                      //Case3 : 1st time user coming to enrollment then display the Message.
						this.IsAlreadyEnrolled = false;
						if (!this.isDisplayCustomScanner) {
							if ($('#display-box-container').hasClass('hide-box-container')) {
								$('#display-box-container').removeClass('hide-box-container')
								$('#display-box-container').addClass('display-box-container')
							}
						} else {
							setTimeout(() => {
								if (($('#display-box-container').hasClass('display-box-container'))) {
									$('#display-box-container').removeClass('display-box-container')
								}
							}, 10)

						}
					}
				}
				this.getUserSettingData();

			}, error: (err: any) => {
				this.isLoading = false;
				this.getUserSettingData();
				console.log(err);
				this.IsAlreadyEnrolled = false;

			}
		});

		// subscribe to shared user settings
		sharedUserStore.userSettings$.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
			if (res) {
				this.UserSettingsInfo = res;
				if (res.UserSetting?.IsLivenessEnable) {
					this.IsFaceEnrollEnabled = true;
					if (!this.IsAlreadyEnrolled && !this.isDisplayCustomScanner) {
						setTimeout(() => {
							if ($('#display-box-container').hasClass('hide-box-container')) {
								$('#display-box-container').removeClass('hide-box-container')
								$('#display-box-container').addClass('display-box-container')
							}
						}, 100)
					}
				}
			}
		});
	};

	themeDir = "../assets/sample-app-resources/images/themes";

	/**
   * @author Ravikiran
   * @description Initiates the user enrollment process for liveness detection using `SampleApp.onEnrollUserPressed()`.
   *              - If an error occurs, it updates the failure message and checks the enrollment status.
   *              - If the enrollment is processed but unsuccessful due to improper pose or lighting, 
   *                it displays a relevant message.
   *              - If the enrollment is successful, it navigates to the HRMS Profile page and displays a success message.
   *              - If no response is received, it stops the loading state.
   * 
   * @returns {void}
   */
	onEnrollmentPressed() {
		// SampleApp.onEnrollUserPressed();
		if (isPlatformBrowser(this.platformId)) {
			SampleApp.onEnrollUserPressed((response: any) => {
				if (response) {
					if (response.error) {
						// this.common.changeIsFailureeMessage(true);
						// this.common.changeResponseMessage(response.errorMessage);
						// this.common.changeToasterResponseMessage(response.errorMessage, 'error');

						this.checkEnroll();
					} else if (response.wasProcessed === true && response.error === false && response.success === false) {
						// this.common.changeIsFailureeMessage(true);
						// this.common.changeResponseMessage(this.customTranslatePipe.transform( 'Please use ideal pose and lighting.',this.changedetect,this.root));
						// this.common.changeToasterResponseMessage(this.customTranslatePipe.transform( 'Please use ideal pose and lighting.',this.changedetect,this.root), 'error');

					}
					else if (response.wasProcessed === true && response.error === false && response.success === true) {
						this.Router.navigate(['/HRMS/Profile'])
						// this.common.changeIsSuccesseMessage(true);
						// this.common.changeResponseMessage(this.customTranslatePipe.transform( 'Face enrolled successfully',this.changedetect,this.root));
						// this.common.changeToasterResponseMessage(this.customTranslatePipe.transform( 'Face enrolled successfully',this.changedetect,this.root), 'success');
						this.checkEnroll();
					}
				} else {
					this.isLoading = false;
				}
			});
		}
	}

	/**
   * @author Biswajit
   * @description Subscribes to user settings updates and checks if liveness detection is enabled.
   *              - If liveness detection is enabled, it updates the `IsFaceEnrollEnabled` flag.
   *              - If the user is not already enrolled, it delays execution slightly before 
   *                updating the UI to show the display box container.
   *              - Uses `takeUntil` to properly clean up the subscription when the component is destroyed.
   * 
   * @returns {void}
   */
	getUserSettingData() {
		// rely only on sharedUserStore; do not fallback to localStorage
		const resObj: any = this.UserSettingsInfo || sharedUserStore.userSettingsSnapshot || null;
		if (resObj) {
			try {
				if (resObj.UserSetting?.IsLivenessEnable) {
					this.IsFaceEnrollEnabled = true;
					if (!this.IsAlreadyEnrolled) {
						if (!this.isDisplayCustomScanner) {
							setTimeout(() => {
								if ($('#display-box-container').hasClass('hide-box-container')) {
									$('#display-box-container').removeClass('hide-box-container')
									$('#display-box-container').addClass('display-box-container')
								}
							}, 100)
						}
					}
				}
			} catch (error) {
				// ignore
			}
		}
	}

	openEnrollCamera() {
		let obj: EnrollDataType = {
			isOpenCamera: true,
			isEnrollFace: true,
			isVerifyFace: false
		}
		this.common.openEnrollCamera(obj);
	}

}
