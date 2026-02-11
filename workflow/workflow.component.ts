import { Component, ElementRef, ViewChild } from '@angular/core';
import { AddPageComponent } from '../add-page/add-page.component';
import { GetMastersAPI, GetWorkFlowByCodeRDLC, GetWorkFlowStatusByProjectRDLC, SaveWorkFlowRDLC, GetWorkFlowNameRDLC, GetProjectMembersByProject, GetRDLCModule, GetRDLCTypeByModuleCode } from 'src/app/constants/constants';
import { FormGroup, Validators } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RoutesObj } from 'src/app/routes.config';
declare let $: any

@Component({
  selector: 'app-workflow',
  templateUrl: './workflow.component.html',
  styleUrls: ['./workflow.component.css', './add-rdlc.shared.css']
})

export class WorkflowComponent extends AddPageComponent {
  routesObj = RoutesObj;
  @ViewChild('workFlowPopup', { static: false }) workFlowPopup !: ElementRef;
  @ViewChild('showConfirmPopup', { static: false }) showConfirmPopup !: ElementRef;
  override currentTabName: string = 'BRD';
  public currentTabIndex: number = 0;
  public onPageLoadLoader = true;
  public workflow!: FormGroup;
  public RDLCTypeData: any;
  public effectiveDate: any = ''
  public isDisplayReactWidget = false;
  public isExpanded = true;
  public isDisableCalendarIcon = false;
  public isFullscreen = false;
  public skipValueChanges: boolean = false;
  public isModifyWorkFlow = false;
  public isWidgetLoaded = false;
  public isWorkflowSelected = false; // Flag to track if workflow is selected from list
  public reactMasterUser: any;
  public reactMasterRole: any;
  public reactMasterAction: any;
  public workFlowName: any;
  public isLoadingSaveWorkflow = false;
  public isLoadingModifyWorkflow = false;
  public shouldInitializeWidgetOnce = true;
  private lastProjectUsersRequestId: any = null;
  private isProjectUsersLoading = false;
  private isRolesLoading = false;
  private hasLoadedRoles = false;
  public highlightedTabNames: string[] = [];
  public mastersObject: any = { RDLCProjectId: [], RDLCModuleId: [], RDLCWorkFlowID: [], WorkflowTypeId: [] };
  private previousReq: any = null;
  public workflows: any;
  public isRDLCModuleSelected = false;
  public getWorkflowResponse: any;
  public currentTabRDLCTypeID: any;
  public formFieldObject: any = {
    RDLCProjectId: {
      FormField: 'Project',
      Label: 'Project',
      Placeholder: 'Select Project',
      Required: true,
      IsHideFieldInUI: false
    },
    RDLCModuleId: {
      FormField: 'Module',
      Label: 'Module',
      Placeholder: 'Select Module',
      Required: true,
      IsHideFieldInUI: false
    },
    WorkflowTypeId: {
      FormField: 'WorkflowType',
      Label: 'Workflow Type',
      Placeholder: 'Select Workflow Type',
      Required: true,
      IsHideFieldInUI: false
    },
    WorkflowName: {
      FormField: 'WorkflowName',
      Label: 'Workflow Name',
      Placeholder: 'Enter Workflow name',
      Required: true,
      IsHideFieldInUI: false
    },
    EffectiveDate: {
      Label: 'Effective Date',
      FormField: 'EffectiveDate',
      Placeholder: 'DD/MM/YYYY',
      Required: true
    }
  };

  override ngOnInit(): void {
    super.ngOnInit();
    this.workflow = this.formBuilder.group({
      Project: [null, Validators.required],
      Module: [null, Validators.required],
      WorkflowType: [null, Validators.required],
      WorkflowName: [null, Validators.required],
      EffectiveDate: [null, Validators.required]
    });
    this.getMaster('HRMSClientProject');
    this.getMaster('RDLCType');
    this.GetWorkFlowModule();
    this.getWorkflowType();
    this.effectiveDate = this.datePipe?.transform(new Date(), 'dd/MM/yyyy') ?? '';
    this.workflow.valueChanges.pipe(debounceTime(1000), distinctUntilChanged()).subscribe((value: any) => {
      if (this.skipValueChanges) return;
      // this.onSubmit(); Auto Save
    });
    
    // Listen to WorkflowType changes
    this.workflow.get('WorkflowType')?.valueChanges.subscribe((value: any) => {
      if (value !== null && value !== undefined) {
        const workflowTypeObj = this.getWorkflowTypeObject(value);
        this.onWorkflowTypeChange(workflowTypeObj);
      } else {
        this.onWorkflowTypeChange(null);
      }
    });
    
    // Listen to WorkflowName changes to auto-bind workflow type when set programmatically
    // Note: Manual selection from dropdown triggers (change) event, so this handles programmatic changes
    this.workflow.get('WorkflowName')?.valueChanges.subscribe((value: any) => {
      if (value && !this.skipValueChanges) {
        // Small delay to ensure getWorkflowResponse is populated and avoid double-triggering
        setTimeout(() => {
          // Only process if getWorkflowResponse is available
          if (this.getWorkflowResponse?.length > 0) {
            const selectedWorkflow = this.getWorkflowResponse.find((item: any) => item.Id === value);
            if (selectedWorkflow && selectedWorkflow.WorkflowTypeId) {
              // Only set workflow type if it's not already set or different
              const currentWorkflowType = this.workflow.get('WorkflowType')?.value;
              if (currentWorkflowType !== selectedWorkflow.WorkflowTypeId) {
                this.onWorkflowNameChange(value);
              }
            }
          }
        }, 150);
      }
    });
    debugger;
    console.log('Current Route URL:', this.route.url);
    console.log('ModifyWorkFlow Route URL:', `/${this.root}${this.routesObj.ModifyWorkFlow}`);
   if (this.route.url == `/${this.root}${this.routesObj.ModifyWorkFlow}`) {
      this.isLoadingModifyWorkflow = true;
      this.loadFormValues();
      this.isModifyWorkFlow = true;
    } else {
      this.isModifyWorkFlow = false;
    }
    document.addEventListener('fullscreenchange', () => { this.isFullscreen = !!document.fullscreenElement; });
    this.clearStorage();
    this.workflow.get(this.formFieldObject['RDLCProjectId'].FormField)?.valueChanges.subscribe((projectId) => {
      if (projectId) {
        this.getProjectusers(this.workflow?.get('Project')?.value);
      }
    });
    this.getMasterForReact('WorkFlowAction');
  }

  ngAfterViewInit(): void {
    const container = document.getElementById('react-widget-container');
    if (container && !container.querySelector('react-widget')) {
      const widget = document.createElement('react-widget');
      container.appendChild(widget);
    }
  }

  override ngOnDestroy(): void {
    this.clearWidget();
    super.ngOnDestroy();
  }

  public loadFormValues() {
    const selected = JSON.parse(sessionStorage.getItem('RDLCSelectedItem') ?? '{}');
    this.onRDLCModuleChange(selected.ModuleName, selected?.ModuleId);
    
    // Only fetch users if it's User Based workflow, otherwise wait for workflow type check
    // Check multiple naming conventions for WorkflowTypeId
    const workflowTypeId = selected.WorkflowTypeId || selected.WorkFlowTypeId || null;
    if (workflowTypeId) {
      // Wait to determine workflow type before fetching users/roles
      const checkAndLoad = () => {
        if (this.mastersObject['WorkflowTypeId']?.length > 0) {
          const selectedWorkflowType = this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === workflowTypeId);
          const workflowTypeName = selectedWorkflowType?.Name;
          const { isUserBased, isRoleBased } = this.getWorkflowTypeFlags(workflowTypeId, workflowTypeName);
          
          if (isUserBased && selected.HRMSClientProjectId) {
            this.getProjectusers(selected.HRMSClientProjectId);
          } else if (isRoleBased) {
            this.getRoles();
          }
          // Trigger workflow type change handler (programmatic - don't clear fields)
          const workflowTypeObj = this.getWorkflowTypeObject(workflowTypeId);
          this.onWorkflowTypeChange(workflowTypeObj, true);
        } else {
          setTimeout(checkAndLoad, 100);
        }
      };
      checkAndLoad();
    } else if (selected.HRMSClientProjectId) {
      // Fallback: if no workflow type, fetch users (legacy behavior)
      this.getProjectusers(selected.HRMSClientProjectId);
    }
    
    this.workFlowName = selected.WorkFlowName ?? '';
    const today = new Date();
    const todayFormatted = this.datePipe?.transform(today, 'dd/MM/yyyy') ?? null;
    
    // Find workflow ID from workflow name if available
    let workflowNameId = selected.WorkFlowNameId || selected.WorkFlowName;
    // If WorkFlowName is a name (string), we'll need to find the ID after workflows are loaded
    // For now, set it as is - it will be resolved when workflows are loaded
    
    this.workflow = this.formBuilder.group({
      Project: [selected.HRMSClientProjectId ?? null, Validators.required],
      Module: [{ value: selected.ModuleId ?? null, disabled: true }],
      WorkflowType: [workflowTypeId, Validators.required],
      WorkflowName: [workflowNameId ?? null, Validators.required],
      EffectiveDate: [todayFormatted, Validators.required]
    });
      this.effectiveDate = todayFormatted;
    this.workflow.get('Project')?.disable();
    this.workflow.get('Module')?.disable();
    this.isDisableCalendarIcon = true;
    
    // If workflow name exists, mark as selected and disable WorkflowType
    if (selected.WorkFlowName || workflowNameId) {
      this.isWorkflowSelected = true;
      this.workflow.get('WorkflowType')?.disable();
      this.workflow.get('WorkflowName')?.disable();
    }
    
    // After workflows are loaded, find and set the correct workflow ID if WorkFlowName was a name
    if (selected.WorkFlowName && !selected.WorkFlowNameId) {
      const findWorkflowId = () => {
        if (this.getWorkflowResponse?.length > 0) {
          const foundWorkflow = this.getWorkflowResponse.find((item: any) => item.Name === selected.WorkFlowName);
          if (foundWorkflow) {
            this.skipValueChanges = true;
            this.workflow.get('WorkflowName')?.patchValue(foundWorkflow.Id);
            this.skipValueChanges = false;
            // Mark as selected and disable WorkflowType/WorkflowName
            this.isWorkflowSelected = true;
            this.workflow.get('WorkflowType')?.disable();
            this.workflow.get('WorkflowName')?.disable();
            // Trigger onWorkflowNameChange to set workflow type
            this.onWorkflowNameChange(foundWorkflow.Id);
          }
        } else {
          setTimeout(findWorkflowId, 200);
        }
      };
      findWorkflowId();
    }
  }

  public onSubmit(): void {
    if (this.workflow.invalid) {
      this.workflow.markAllAsTouched();
      return;
    }
    const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
    let selected: any = {};
    try {
      selected = selectedRaw ? JSON.parse(selectedRaw) : {};
    } catch (e) {
      console.warn('Invalid JSON in RDLCSelectedItem', e);
      selected = {};
    }
    // Find selected workflow from the list if a workflow name is selected
    let selectedWorkflow: any = null;
    let selectedWorkflowName: any = null;
    const selectedWorkflowId = this.workflow?.get('WorkflowName')?.value;
    if (selectedWorkflowId && this.getWorkflowResponse?.length > 0) {
      selectedWorkflow = this.getWorkflowResponse?.find((item: any) => item.Id === selectedWorkflowId);
      if (selectedWorkflow) {
        selectedWorkflowName = selectedWorkflow.Name;
      }
    }
    
    // Get WorkflowType ID and name - prioritize selected workflow object, then form control, then RDLCSelectedItem
    let workflowTypeId = null;
    let workflowTypeName = null;
    
    if (selectedWorkflow) {
      // Priority 1: From selected workflow object (check multiple naming conventions)
      workflowTypeId = selectedWorkflow.WorkflowTypeId || selectedWorkflow.WorkFlowTypeId || selectedWorkflow.workflowtypeid || selectedWorkflow.workflowtypeid;
      workflowTypeName = selectedWorkflow.WorkflowTypeName || selectedWorkflow.WorkFlowTypeName || selectedWorkflow.workflowtypename || selectedWorkflow.workflowtypename;
      
      // Set it in the form control if not already set
      if (workflowTypeId && !this.workflow?.get('WorkflowType')?.value) {
        this.workflow.get('WorkflowType')?.patchValue(workflowTypeId);
        const workflowTypeObj = this.getWorkflowTypeObject(workflowTypeId);
        this.onWorkflowTypeChange(workflowTypeObj, true);
      }
    }
    
    // If not found in workflow object, check form control
    if (!workflowTypeId && this.workflow?.get('WorkflowType')?.value) {
      // Priority 2: From form control
      workflowTypeId = this.workflow?.get('WorkflowType')?.value;
    } else if (!workflowTypeId && (selected?.WorkflowTypeId || selected?.WorkFlowTypeId)) {
      // Priority 3: From RDLCSelectedItem (check multiple naming conventions)
      workflowTypeId = selected.WorkflowTypeId || selected.WorkFlowTypeId;
    }
    
    // If workflowTypeName is not set yet, get it from masters
    if (!workflowTypeName && workflowTypeId) {
      const selectedWorkflowType = this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === workflowTypeId);
      workflowTypeName = selectedWorkflowType?.Name ?? null;
    }
    
    // Get ProjectId - use form control value if available, otherwise fallback to sessionStorage
    let projectId = this.workflow?.get('Project')?.value;
    if (!projectId || projectId === null || projectId === undefined) {
      // Fallback to RDLCSelectedItem for role-based workflows or when Project field is cleared
      projectId = selected.HRMSClientProjectId;
    }
    
    const workflowData: any = {
      WorkFlowName: selectedWorkflowName ?? this.workFlowName ?? this.workflow?.get('WorkflowName')?.value ?? '',
      ModuleId: this.workflow?.get('Module')?.value,
      ProjectId: projectId,
      RDLCTypeId: this.currentTabRDLCTypeID ?? '',
      DateEffective: this.datePipe.transform(this.parseDateString(this.effectiveDate), 'dd MMMM yyyy'),
      Id: this.isHighlightedTab(this.currentTabName) ? selected.Id : '',
      WorkFlowActionId: this.isModifyWorkFlow ? selected.WorkFlowActionId : '',
      WorkflowTypeId: workflowTypeId,
      WorkflowTypeName: workflowTypeName
    };
    // localStorage.setItem('workflowForm', JSON.stringify(workflowData));
    sessionStorage.setItem('workflowForm', JSON.stringify(workflowData));
    this.workFlowName = selectedWorkflowName ?? this.workflow?.get('WorkflowName')?.value;
    if (!this.isModifyWorkFlow) this.workflow.disable();
    this.isDisableCalendarIcon = true;
    this.isDisplayReactWidget = true;
    this.skipValueChanges = true;
    // localStorage.removeItem('ModifyWorkFlowJson');
    // localStorage.removeItem('workflowJson');
    sessionStorage.removeItem('ModifyWorkFlowJson');
    sessionStorage.removeItem('workflowJson');
    this.clearWidget();
    if (this.isHighlightedTab(this.currentTabName)) {
      this.isModifyWorkFlowAPI();
    } else {
      this.initializeReactWidget();
    }
  }

  public parseDateString(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = +parts[0];
    const month = +parts[1] - 1;
    const year = +parts[2];
    return new Date(year, month, day);
  }

  public tabWorkflowStatus() {
    this.onPageLoadLoader = true;
    // Show loader on Generate/Load Workflow while tabs/workflow status are fetched
    this.isLoadingModifyWorkflow = true;
    const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
    let selected: any = {};
    try {
      selected = selectedRaw ? JSON.parse(selectedRaw) : {};
    } catch (e) {
      selected = {};
    }
    const request = { ProjectId: selected.HRMSClientProjectId };
    this.api.postService(GetWorkFlowStatusByProjectRDLC, request).subscribe((response) => {
      if (response?.Data) {
        response.Data.forEach((item: any) => {
          const rdlcTypeId = item.RDLCTypeId;
          if (!rdlcTypeId) return;
          const matchedType = this.RDLCTypeData.find((type: any) => type.Id?.toLowerCase?.().trim() === rdlcTypeId.toLowerCase().trim());
          if (!matchedType.Name) return;
          const rdlcNameKey = matchedType.Name.toLowerCase().trim();
          const mappedTabName = rdlcNameKey ?? matchedType.Name;
          const matchedTab = this.databagRDLCService.rdlcTabs.find(tab => tab.RDLCTypeName?.toLowerCase().trim() === mappedTabName.toLowerCase().trim());
          if (matchedTab) {
            this.highlightedTabNames.push(matchedTab.RDLCTypeName);
          }
          this.isLoadingModifyWorkflow = false;
          this.isLoadingModifyWorkflow = false;
          this.onPageLoadLoader = false;
        });
        let req: any = {
          RDLCTypeId: this.currentTabRDLCTypeID ?? '',
          Active: 'true',
          HRMSClientProjectId: this.workflow?.get('Project')?.value
        };
        this.getWorkflowName(req);
      } else {
        console.warn("No data in response.Data");
        this.isLoadingModifyWorkflow = false;
      }
    });
  }

  public isHighlightedTab(RDLCTypeName: string): boolean {
    return this.highlightedTabNames.some((name) => name.toLowerCase() === RDLCTypeName.toLowerCase());
  }

  public isModifyWorkFlowAPI() {
    this.isLoadingModifyWorkflow = true;
    const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
    let selected: any = {};
    try {
      selected = selectedRaw ? JSON.parse(selectedRaw) : {};
    } catch (e) {
      selected = {};
    }
    let Request = {
      code: selected?.HRMSClientProjectId ?? '',
      code1: this.currentTabRDLCTypeID ?? '',
      code2: this.workflow?.get('WorkflowName')?.value ?? ''
    }
    this.api.postService(GetWorkFlowByCodeRDLC, Request).subscribe((response) => {
      console.log('Modify Workflow Response:', response);
      if (response?.ReturnCode === 0) {
        this.isLoadingModifyWorkflow = false;
        const workflowData = response?.Data[0];
        const content = workflowData?.WorkFlowContent;
        if (!content) {
          this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage("Couldn't load the workflow. Please try again later.");
        } else {
          this.workflow.disable();
        }
        
        // Extract and set WorkflowTypeId from API response if available
        if (workflowData?.WorkflowTypeId) {
          this.skipValueChanges = true;
          this.workflow.get('WorkflowType')?.patchValue(workflowData.WorkflowTypeId);
          const workflowTypeObj = this.getWorkflowTypeObject(workflowData.WorkflowTypeId);
          this.onWorkflowTypeChange(workflowTypeObj, true);
          this.skipValueChanges = false;
          
          // Update RDLCSelectedItem in sessionStorage with WorkflowTypeId and WorkflowTypeName if missing
          const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
          if (selectedRaw) {
            try {
              const selected = JSON.parse(selectedRaw);
              if (!selected.WorkflowTypeId) {
                selected.WorkflowTypeId = workflowData.WorkflowTypeId;
                // Get workflow type name from masters
                const workflowType = this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === workflowData.WorkflowTypeId);
                if (workflowType?.Name) {
                  selected.WorkflowTypeName = workflowType.Name;
                }
                sessionStorage.setItem('RDLCSelectedItem', JSON.stringify(selected));
              }
            } catch (e) {
              console.warn('Failed to update RDLCSelectedItem with WorkflowTypeId:', e);
            }
          }
          
          // Update workflowForm data
          this.updateLocalStorage();
        }
        
        try {
          const parsedContent = JSON.parse(content);
          sessionStorage.setItem('ModifyWorkFlowJson', JSON.stringify(parsedContent));
          if (!(window as any).reactwidgetRef?.isInitialized) {
            this.initializeReactWidget();
            setTimeout(() => this.loadWorkflow(), 1500);
            return;
          }
        } catch (error) {
          console.error('Failed to parse ModifyWorkFlowJson:', error);
        }
      } else {
        this.isLoadingModifyWorkflow = false;
      }
    });
  }

  public loadWorkflow() {
    this.isLoadingModifyWorkflow = true;
    // const storedJson = localStorage.getItem('ModifyWorkFlowJson');
    const storedJson = sessionStorage.getItem('ModifyWorkFlowJson');
    if (!storedJson) {
      console.warn("No workflow found in localStorage");
      return;
    }
    try {
      const parsedJson = JSON.parse(storedJson);
      const reactwidgetRef = (window as any).reactwidgetRef;
      if (reactwidgetRef?.convertJsonToWorkflow) {
        reactwidgetRef.convertJsonToWorkflow(parsedJson);
      } else {
        console.error("Widget not properly initialized - convertJsonToWorkflow function not found");
      }
    } catch (err) {
      console.error("Failed to parse or load workflow:", err);
    }
  }

  public initializeReactWidget() {
    if (this.shouldInitializeWidgetOnce) {
      this.shouldInitializeWidgetOnce = false;
      const reactwidget = (window as any).reactwidget;
      const jwtToken = localStorage.getItem('jwtToken') ?? '';
      const widgetElement = document.querySelector('react-widget');
      
      // Check if Role Based workflow and roles are not loaded yet
      const workflowTypeId = this.workflow?.get('WorkflowType')?.value;
      const selectedWorkflowType = this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === workflowTypeId);
      const workflowTypeName = selectedWorkflowType?.Name;
      const { isRoleBased } = this.getWorkflowTypeFlags(workflowTypeId, workflowTypeName);
      
      if (isRoleBased && !this.reactMasterRole) {
        // Wait for roles to load before initializing widget
        const checkRoles = () => {
          if (this.reactMasterRole) {
            this.doInitializeReactWidget(reactwidget, jwtToken, widgetElement);
          } else {
            setTimeout(checkRoles, 100);
          }
        };
        checkRoles();
        return;
      }
      
      this.doInitializeReactWidget(reactwidget, jwtToken, widgetElement);
    }
  }

  private doInitializeReactWidget(reactwidget: any, jwtToken: string, widgetElement: Element | null): void {
    reactwidget.setApiUrls({
      getActions: () => Promise.resolve(this.reactMasterAction),
      getUsers: () => {
        // Return roles if available, otherwise return users
        // This function is called dynamically, so it will always get the current values
        const data = this.reactMasterRole || this.reactMasterUser;
        console.log('getUsers called - returning data:', data);
        console.log('reactMasterRole:', this.reactMasterRole);
        console.log('reactMasterUser:', this.reactMasterUser);
        if (data && data.Data && data.Data.ProjectMemberDetails) {
          console.log('Data.ProjectMemberDetails exists, count:', data.Data.ProjectMemberDetails.length);
          if (data.Data.ProjectMemberDetails.length > 0) {
            console.log('First item structure:', Object.keys(data.Data.ProjectMemberDetails[0]));
          }
        }
        return Promise.resolve(data);
      },
      getRoles: () => {
        // Return roles if available, otherwise return users
        // This function is called dynamically, so it will always get the current values
        const data = this.reactMasterRole || this.reactMasterUser;
        console.log('getUsers called - returning data:', data);
        console.log('reactMasterRole:', this.reactMasterRole);
        console.log('reactMasterUser:', this.reactMasterUser);
        if (data && data.Data && data.Data.ProjectMemberDetails) {
          console.log('Data.ProjectMemberDetails exists, count:', data.Data.ProjectMemberDetails.length);
          if (data.Data.ProjectMemberDetails.length > 0) {
            console.log('First item structure:', Object.keys(data.Data.ProjectMemberDetails[0]));
          }
        }
        return Promise.resolve(data);
      },
      getSaveButtonColour: () => Promise.resolve('#4b49ac'),
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
      reactwidget.setSidebarItems([
        { label: 'Start', type: 'Start' },
        { label: 'Step', type: 'Step' },
        { label: 'Stop', type: 'Stop' },
      ]);
      reactwidget.setConfig({
        nodeTypes: {
          Start: this.modulePermissionObj['Create/Update'],
          Step: this.modulePermissionObj['Create/Update'],
          Stop: this.modulePermissionObj['Create/Update'],
          Decision: false
        },
        buttons: {
          create: false,
          load: false,
          save: false,
          download: false,
          view: false
        },
        showTemplateWorkflow: !(this.isHighlightedTab(this.currentTabName) && this.isModifyWorkFlow),
      });
      try {
        if (!(window as any).reactwidget._isInitialized) {
          reactwidget.initialise();
          (window as any).reactwidget._isInitialized = true;
        } else {
          console.warn("React widget already initialized. Skipping reinitialization.");
        }
        setTimeout(() => {
          if (!widgetElement) {
            console.error("React widget element not found");
            return;
          }
          (window as any).reactwidgetRef = {
            ...(window as any).reactwidgetRef,
            isInitialized: true,
            convertJsonToWorkflow: (json: any) => {
              try {
                const event = new CustomEvent('load-workflow', {
                  detail: json,
                  bubbles: true,
                  composed: true
                });
                widgetElement.dispatchEvent(event);
                this.isDisplayReactWidget = true;
                this.isLoadingModifyWorkflow = false;
              } catch (err) {
                console.error("Error dispatching load-workflow event:", err);
              }
            },
            viewJson: () => {
              try {
                const event = new CustomEvent('get-workflow-json', {
                  bubbles: true,
                  composed: true
                });
                widgetElement.dispatchEvent(event);
                this.isLoadingModifyWorkflow = false;
                return null;
              } catch (err) {
                console.error("Error dispatching get-workflow-json event:", err);
                return null;
              }
            }
          };
        }, 1000);
      } catch (error) {
        console.error("Failed to initialize React widget:", error);
      }
      this.isWidgetLoaded = true;
  }

  override changeTab(tab: any, index?: any) {
    if (this.workflow.invalid && !this.isModifyWorkFlow) {
      this.workflow.markAllAsTouched();
      return;
    }
    const RDLCTypeName = tab?.RDLCTypeName?.toLowerCase();
    const mappedName = RDLCTypeName ?? tab?.RDLCTypeName;
    this.currentTabIndex = index;
    if (tab.RDLCTypeName != 'BRD') {
      this.isDisableCalendarIcon = true;
    } else {
      if (!this.isModifyWorkFlow) {
        this.workflow.enable();
        this.workflow.get('Module')?.disable();
        if (this.isDisplayReactWidget) {
          this.workflow.get('Project')?.disable();
        }
        // Keep WorkflowType disabled if workflow is selected from list
        if (this.isWorkflowSelected) {
          this.workflow.get('WorkflowType')?.disable();
        }
        this.isDisableCalendarIcon = false;
      }
    }
    this.formData = undefined;
    this.templeteCodeJson = '';
    this.templeteCode = tab.TemplateCode;
    this.currentTabName = tab?.RDLCTypeName;
    this.selectedTab = structuredClone(tab);
    this.templeteCodeJson = tab.JsonURL;
    this.currentTabRDLCTypeID = tab.Id;
    this.isDisplayReactWidget = false;
    this.isWidgetLoaded = false;
    this.shouldInitializeWidgetOnce = true;
    this.clearWidget();
    this.updateLocalStorage();
    this.clearWorkFlowName();
  }

  public clearWorkFlowName() {
    if (this.isHighlightedTab(this.currentTabName)) {
      this.bindValue(this.getWorkflowResponse);
      let req: any = {
        RDLCTypeId: this.currentTabRDLCTypeID ?? '',
        Active: 'true',
        HRMSClientProjectId: this.workflow?.get('Project')?.value
      };
      if (this.isRequestChanged(req)) {
        this.getWorkflowName(req);
        this.previousReq = req;
      }
      this.workflow.get('EffectiveDate')?.enable();
      this.workflow.get('WorkflowName')?.enable();
    } else {
      this.workflow.get('WorkflowName')?.setValue('');
      this.workflow.get('WorkflowName')?.enable();
    }
  }

  public updateLocalStorage() {
    const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
    let selected: any = {};
    try {
      selected = selectedRaw ? JSON.parse(selectedRaw) : {};
      sessionStorage.removeItem('workflowForm')
    } catch (e) {
      console.warn('Invalid JSON in RDLCSelectedItem', e);
      selected = {};
    }
    
    // Find selected workflow from the list if a workflow name is selected
    let selectedWorkflow: any = null;
    let workflowName = this.workflow?.get('WorkflowName')?.value;
    if (workflowName && this.getWorkflowResponse?.length > 0) {
      selectedWorkflow = this.getWorkflowResponse?.find((item: any) => item.Id === workflowName);
      // If workflow is found, use its Name property instead of the ID
      if (selectedWorkflow?.Name) {
        workflowName = selectedWorkflow.Name;
      }
    }
    
    // Get WorkflowType ID and name - prioritize selected workflow object, then form control, then RDLCSelectedItem
    let workflowTypeId = null;
    let workflowTypeName = null;
    
    if (selectedWorkflow) {
      // Priority 1: From selected workflow object (check multiple naming conventions)
      workflowTypeId = selectedWorkflow.WorkflowTypeId || selectedWorkflow.WorkFlowTypeId || selectedWorkflow.workflowtypeid || selectedWorkflow.workflowtypeid;
      workflowTypeName = selectedWorkflow.WorkflowTypeName || selectedWorkflow.WorkFlowTypeName || selectedWorkflow.workflowtypename || selectedWorkflow.workflowtypename;
    }
    
    // If not found in workflow object, check form control
    if (!workflowTypeId && this.workflow?.get('WorkflowType')?.value) {
      // Priority 2: From form control
      workflowTypeId = this.workflow?.get('WorkflowType')?.value;
    } else if (!workflowTypeId && (selected?.WorkflowTypeId || selected?.WorkFlowTypeId)) {
      // Priority 3: From RDLCSelectedItem (check multiple naming conventions)
      workflowTypeId = selected.WorkflowTypeId || selected.WorkFlowTypeId;
    }
    
    // If workflowTypeName is not set yet, get it from masters
    if (!workflowTypeName && workflowTypeId) {
      const selectedWorkflowType = this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === workflowTypeId);
      workflowTypeName = selectedWorkflowType?.Name ?? null;
    }
    
    // Get ProjectId - use form control value if available, otherwise fallback to sessionStorage
    let projectId = this.workflow?.get('Project')?.value;
    if (!projectId || projectId === null || projectId === undefined) {
      // Fallback to RDLCSelectedItem for role-based workflows or when Project field is cleared
      projectId = selected.HRMSClientProjectId;
    }
    
    const workflowData: any = {
      WorkFlowName: workflowName || this.workFlowName || '',
      ModuleId: this.workflow?.get('Module')?.value,
      ProjectId: projectId,
      RDLCTypeId: this.currentTabRDLCTypeID ?? '',
      DateEffective: this.datePipe.transform(this.parseDateString(this.effectiveDate), 'dd MMMM yyyy'),
      Id: this.isHighlightedTab(this.currentTabName) ? selected.Id : '',
      WorkFlowActionId: this.isModifyWorkFlow ? selected.WorkFlowActionId : '',
      WorkflowTypeId: workflowTypeId,
      WorkflowTypeName: workflowTypeName
    };
    sessionStorage.setItem('workflowForm', JSON.stringify(workflowData));
  }

  public getMaster(code: string): void {
    const req = {
      Active: 'true',
      MasterDataCode: code
    };
    this.api.postService(GetMastersAPI, req).subscribe({
      next: (res: any) => {
        if (code === 'RDLCType') {
          this.RDLCTypeData = res?.Data?.length ? res.Data : [];
        } else {
          this.mastersObject['RDLCProjectId'] = res?.Data?.length ? res.Data : [];
        }
        this.onPageLoadLoader = false;
      },
      error: (err: any) => {
        console.error(err);
        this.mastersObject['RDLCProjectId'] = [];
        this.onPageLoadLoader = false;
      }
    });
  }

  public getMasterForReact(code: string): void {
    const req = {
      Active: 'true',
      MasterDataCode: code
    };
    this.api.postService(GetMastersAPI, req).subscribe({
      next: (response: any) => {
        if (code === 'WorkFlowAction') {
          this.reactMasterAction = response;
        }
      }
    });
  }

  public openDatePicker(id: string) {
    if (isPlatformBrowser(this.platformId)) {
      if ($('#' + id)) {
        $('#' + id).datetimepicker('show');
      }
    }
  }

  public changeDate(event: any) {
    if (event.date) {
      if (event.id == 'EffectiveDate') {
        this.effectiveDate = this.datePipe?.transform((event.date), 'dd/MM/yyyy') ?? '';
      }
    } else {
      this.effectiveDate = '';
    }
  }

  public toggleFullscreen() {
    if (!this.isFullscreen) {
      const element = this.elementRef.nativeElement.querySelector('.container');
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
    this.isFullscreen = !this.isFullscreen;
  }

  public saveWorkflow() {
    this.isLoadingSaveWorkflow = true;
    // Update workflowForm with latest values before saving
    this.updateLocalStorage();
    
    const reactViewJson = (window as any).reactwidgetRef?.viewJson;
    if (typeof reactViewJson === 'function') {
      reactViewJson(); // React saves the workflowJson in localStorage
    }
    setTimeout(() => {
      let json = sessionStorage.getItem('workflowJson');
      if (json) {
        const parsed = JSON.parse(json);
        
        // Merge workflowForm data with workflowJson to include all IDs including WorkflowTypeId
        const workflowFormData = sessionStorage.getItem('workflowForm');
        if (workflowFormData) {
          try {
            const formData = JSON.parse(workflowFormData);
            // Merge form data into the parsed workflow JSON
            if (formData.Id !== undefined) parsed.Id = formData.Id;
            if (formData.WorkFlowName !== undefined && formData.WorkFlowName !== null) parsed.WorkFlowName = formData.WorkFlowName;
            if (formData.ModuleId !== undefined) parsed.ModuleId = formData.ModuleId;
            
            // Handle ProjectId - use formData if available, otherwise fallback to sessionStorage
            let projectId = formData.ProjectId;
            if (!projectId || projectId === null || projectId === undefined) {
              // Try to get from RDLCSelectedItem in sessionStorage as fallback
              const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
              if (selectedRaw) {
                try {
                  const selected = JSON.parse(selectedRaw);
                  projectId = selected.HRMSClientProjectId;
                } catch (e) {
                  console.warn('Failed to parse RDLCSelectedItem for ProjectId fallback:', e);
                }
              }
            }
            if (projectId !== undefined && projectId !== null) {
              parsed.ProjectId = projectId;
            }
            
            if (formData.RDLCTypeId !== undefined) parsed.RDLCTypeId = formData.RDLCTypeId;
            if (formData.DateEffective !== undefined && formData.DateEffective !== null) parsed.DateEffective = formData.DateEffective;
            if (formData.WorkFlowActionId !== undefined) parsed.WorkFlowActionId = formData.WorkFlowActionId;
            
            // Remove empty WorkFlowTypeId from React widget if it exists
            if (parsed.WorkFlowTypeId === '' || parsed.WorkFlowTypeId === null || parsed.WorkFlowTypeId === undefined) {
              delete parsed.WorkFlowTypeId;
            }
            
            // Include WorkflowTypeId (ID) and WorkflowTypeName (name)
            if (formData.WorkflowTypeId !== undefined && formData.WorkflowTypeId !== null && formData.WorkflowTypeId !== '') {
              parsed.WorkflowTypeId = formData.WorkflowTypeId;
            }
            if (formData.WorkflowTypeName !== undefined && formData.WorkflowTypeName !== null && formData.WorkflowTypeName !== '') {
              parsed.WorkflowTypeName = formData.WorkflowTypeName;
            }
          } catch (e) {
            console.warn('Failed to parse workflowForm data:', e);
          }
        }
        
        this.api.postService(SaveWorkFlowRDLC, parsed).subscribe({
          next: (response: any) => {
              if (response && response.ReturnCode == 0) {
              this.common.changeIsSuccesseMessage(true);
              this.common.changeResponseMessage(response.ReturnMessage);
              this.clearStorage();
              this.route.navigate([`${this.root}${this.routesObj.WorkFlowList}`]);
              this.isModifyWorkFlow = true;
            } else {
              this.common.changeIsFailureeMessage(true);
              this.common.changeResponseMessage(response.ReturnMessage);
            }
          },
          error: (err: any) => {
            this.isLoadingSaveWorkflow = false;
          }
        });
      }
      this.isLoadingSaveWorkflow = false;
    }, 300);
  }

  public clearWidget() {
    const container = document.getElementById('react-widget-container');
    if (container) {
      const existingWidget = container.querySelector('react-widget');
      if (existingWidget) {
        existingWidget.remove();
        const widget = document.createElement('react-widget');
        container.appendChild(widget);
      }
    }
    this.isLoadingSaveWorkflow = false;
    this.isLoadingModifyWorkflow = false;
  }

  public clearStorage() {
    // localStorage.removeItem('workflowForm');
    // localStorage.removeItem('ModifyWorkFlowJson');
    // localStorage.removeItem('workflowJson');
    sessionStorage.removeItem('workflowForm');
    sessionStorage.removeItem('ModifyWorkFlowJson');
    sessionStorage.removeItem('workflowJson');
  }

  public getProjectusers(projectID: any) {
    // Project dropdown change triggers user fetch; toggle loader on Generate Workflow
    if (!projectID || this.isProjectUsersLoading || this.lastProjectUsersRequestId === projectID) {
      return;
    }
    this.lastProjectUsersRequestId = projectID;
    this.isProjectUsersLoading = true;
    this.isLoadingModifyWorkflow = true;
    const request = {
      Code: projectID ?? '',
      ModuleCode: this.moduleCode
    }
    this.api.postService(GetProjectMembersByProject, request).subscribe({
      next: (response: any) => {
        if (response.ReturnCode == 0) {
          this.reactMasterUser = null;
          this.reactMasterUser = response;
          this.isLoadingModifyWorkflow = false;
          this.isProjectUsersLoading = false;
        } else {
          this.reactMasterUser = null;
          this.isLoadingModifyWorkflow = false;
          this.isProjectUsersLoading = false;
        }
      },
      error: (err: any) => {
        console.error(err);
        this.reactMasterUser = null;
        this.isLoadingModifyWorkflow = false;
        this.isProjectUsersLoading = false;
      }
    });
  }

  public getWorkflowName(req: any) {
    this.api.postService(GetWorkFlowNameRDLC, req).subscribe((response: any) => {
      if (response.Data && response.ReturnCode == 0) {
        this.workflows = response.Data;
        this.mastersObject['RDLCWorkFlowID'] = response?.Data;
        this.getWorkflowResponse = response?.Data;
        this.bindValue(response);
      } else {
        this.mastersObject['RDLCWorkFlowID'] = [];
      }
    });
  }

  public bindValue(response: any) {
    if (response?.Data?.length === 1) {
      const onlyItem = response?.Data[0];
      this.skipValueChanges = true; // Prevent triggering valueChanges during update
      this.workflow.get('WorkflowName')?.patchValue(onlyItem.Id);
      this.workFlowName = onlyItem.Name;
      
      // Get WorkflowTypeId and WorkflowTypeName from the workflow object (check multiple naming conventions)
      const workflowTypeId = onlyItem.WorkflowTypeId || onlyItem.WorkFlowTypeId || onlyItem.workflowtypeid || onlyItem.workflowtypeid;
      const workflowTypeName = onlyItem.WorkflowTypeName || onlyItem.WorkFlowTypeName || onlyItem.workflowtypename || onlyItem.workflowtypename;
      
      // Set WorkflowType if it exists in the workflow object
      if (workflowTypeId) {
        this.workflow.get('WorkflowType')?.patchValue(workflowTypeId);
        const workflowTypeObj = this.getWorkflowTypeObject(workflowTypeId);
        this.onWorkflowTypeChange(workflowTypeObj, true);
        
        // Update RDLCSelectedItem in sessionStorage with WorkflowTypeId and WorkflowTypeName
        const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
        if (selectedRaw) {
          try {
            const selected = JSON.parse(selectedRaw);
            // Update both naming conventions to ensure compatibility
            selected.WorkflowTypeId = workflowTypeId;
            selected.WorkFlowTypeId = workflowTypeId;
            // Use WorkflowTypeName from workflow object if available, otherwise get from masters
            if (workflowTypeName) {
              selected.WorkflowTypeName = workflowTypeName;
              selected.WorkFlowTypeName = workflowTypeName;
            } else {
              // Fallback: Get workflow type name from masters
              const workflowType = this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === workflowTypeId);
              if (workflowType?.Name) {
                selected.WorkflowTypeName = workflowType.Name;
                selected.WorkFlowTypeName = workflowType.Name;
              }
            }
            sessionStorage.setItem('RDLCSelectedItem', JSON.stringify(selected));
          } catch (e) {
            console.warn('Failed to update RDLCSelectedItem with WorkflowTypeId:', e);
          }
        }
        // Mark workflow as selected and disable WorkflowType/WorkflowName dropdowns
        this.isWorkflowSelected = true;
        this.workflow.get('WorkflowType')?.disable();
        this.workflow.get('WorkflowName')?.disable();
      }
      this.skipValueChanges = false;
      // Trigger onWorkflowNameChange to ensure workflow type is set
      setTimeout(() => {
        this.onWorkflowNameChange(onlyItem.Id);
      }, 100);
    } else {
      this.isWorkflowSelected = false;
      this.workflow.get('WorkflowName')?.enable();
      this.workflow.get('WorkflowName')?.patchValue(null);
    }
  }

  public onWorkflowNameChange(selectedWorkflowId: any) {
    if (!selectedWorkflowId) {
      this.isWorkflowSelected = false;
      this.workflow.get('WorkflowName')?.enable();
      return;
    }
    
    console.log('onWorkflowNameChange called with:', selectedWorkflowId);
    console.log('getWorkflowResponse:', this.getWorkflowResponse);
    console.log('mastersObject WorkflowTypeId:', this.mastersObject['WorkflowTypeId']);
    
    // Wait for getWorkflowResponse to be populated if it's not ready yet
    if (!this.getWorkflowResponse || this.getWorkflowResponse.length === 0) {
      console.log('getWorkflowResponse not ready, retrying...');
      setTimeout(() => this.onWorkflowNameChange(selectedWorkflowId), 200);
      return;
    }
    
    const selectedWorkflow = this.getWorkflowResponse?.find((item: any) => item.Id === selectedWorkflowId);
    console.log('Selected workflow found:', selectedWorkflow);
    
    if (selectedWorkflow) {
      // Set the workflow name property
      this.workFlowName = selectedWorkflow.Name || '';
      this.isWorkflowSelected = true;
      this.workflow.get('WorkflowName')?.disable();
      
      // Get WorkflowTypeId and WorkflowTypeName from the selected workflow (check multiple naming conventions)
      const workflowTypeId = selectedWorkflow.WorkflowTypeId || selectedWorkflow.WorkFlowTypeId || selectedWorkflow.workflowtypeid || selectedWorkflow.workflowtypeid;
      const workflowTypeName = selectedWorkflow.WorkflowTypeName || selectedWorkflow.WorkFlowTypeName || selectedWorkflow.workflowtypename || selectedWorkflow.workflowtypename;
      
      // Set WorkflowType if it exists in the selected workflow
      if (workflowTypeId) {
        console.log('Setting WorkflowTypeId:', workflowTypeId);
        console.log('Setting WorkflowTypeName:', workflowTypeName);
        
        // Function to set workflow type once masters are loaded
        const setWorkflowType = () => {
          this.skipValueChanges = true; // Prevent triggering valueChanges during update
          
          // Ensure the workflow type ID is a string for proper comparison
          const workflowTypeIdStr = String(workflowTypeId);
          
          // Verify the workflow type exists in masters before setting
          const workflowTypeExists = this.mastersObject['WorkflowTypeId']?.some((item: any) => String(item.Id) === workflowTypeIdStr);
          if (!workflowTypeExists) {
            console.warn('WorkflowTypeId not found in masters:', workflowTypeIdStr);
            console.log('Available workflow types:', this.mastersObject['WorkflowTypeId']?.map((item: any) => item.Id));
            this.skipValueChanges = false;
            return;
          }
          
          // Use patchValue with emitEvent: false to update without triggering valueChanges
          this.workflow.get('WorkflowType')?.patchValue(workflowTypeIdStr, { emitEvent: false });
          console.log('WorkflowType set to form control:', workflowTypeIdStr);
          console.log('Current WorkflowType value:', this.workflow.get('WorkflowType')?.value);
          console.log('WorkflowType masters available:', this.mastersObject['WorkflowTypeId']?.length);
          
          // Update RDLCSelectedItem in sessionStorage with WorkflowTypeId and WorkflowTypeName
          const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
          if (selectedRaw) {
            try {
              const selected = JSON.parse(selectedRaw);
              // Update both naming conventions to ensure compatibility
              selected.WorkflowTypeId = workflowTypeId;
              selected.WorkFlowTypeId = workflowTypeId;
              // Use WorkflowTypeName from workflow object if available, otherwise get from masters
              if (workflowTypeName) {
                selected.WorkflowTypeName = workflowTypeName;
                selected.WorkFlowTypeName = workflowTypeName;
              } else {
                // Fallback: Get workflow type name from masters
                const workflowType = this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === workflowTypeId);
                if (workflowType?.Name) {
                  selected.WorkflowTypeName = workflowType.Name;
                  selected.WorkFlowTypeName = workflowType.Name;
                }
              }
              sessionStorage.setItem('RDLCSelectedItem', JSON.stringify(selected));
            } catch (e) {
              console.warn('Failed to update RDLCSelectedItem with WorkflowTypeId:', e);
            }
          }
          
          // Small delay to ensure form control is updated before calling onWorkflowTypeChange
          setTimeout(() => {
            // Call onWorkflowTypeChange to handle the change (user/role based logic) - programmatic, don't clear fields
            const workflowTypeObj = this.getWorkflowTypeObject(workflowTypeIdStr);
            this.onWorkflowTypeChange(workflowTypeObj, true);
            this.skipValueChanges = false;
            // Mark workflow as selected and disable WorkflowType dropdown
            this.isWorkflowSelected = true;
            this.workflow.get('WorkflowType')?.disable();
            // Update workflowForm data after workflow type change is processed
            this.updateLocalStorage();
          }, 50);
        };
        
        // Wait for workflow type masters to be loaded if not ready
        if (!this.mastersObject['WorkflowTypeId'] || this.mastersObject['WorkflowTypeId'].length === 0) {
          console.log('WorkflowType masters not loaded, waiting...');
          const waitForMasters = () => {
            if (this.mastersObject['WorkflowTypeId'] && this.mastersObject['WorkflowTypeId'].length > 0) {
              console.log('WorkflowType masters loaded, setting workflow type');
              setWorkflowType();
            } else {
              setTimeout(waitForMasters, 100);
            }
          };
          waitForMasters();
        } else {
          setWorkflowType();
        }
      } else {
        console.warn('Selected workflow does not have WorkflowTypeId');
        // Update workflowForm data even if no workflow type
        this.updateLocalStorage();
      }
    } else {
      console.warn('Workflow not found in getWorkflowResponse for ID:', selectedWorkflowId);
    }
  }

  public navigateToRDLCTypeTab() {
    const selectedRaw = sessionStorage.getItem('RDLCSelectedItem');
    let selected: any = {};
    try {
      selected = selectedRaw ? JSON.parse(selectedRaw) : {};
    } catch (e) {
      console.warn('Invalid JSON in RDLCSelectedItem', e);
      selected = {};
    }
    const rdlcTypeName = selected?.RDLCTypeName?.toLowerCase();
    const expectedRDLCTypeName = rdlcTypeName;
    const tabIndex = this.databagRDLCService.rdlcTabs.findIndex(tab => tab.RDLCTypeName.toLowerCase() === expectedRDLCTypeName);
    if (tabIndex !== -1) {
      const tab = this.databagRDLCService.rdlcTabs[tabIndex];
      this.changeTab(tab, tabIndex);
    } else {
      console.warn(`No tab found for RDLCTypeName: ${rdlcTypeName}`);
    }
  }

  private isRequestChanged(newReq: any): boolean {
    return JSON.stringify(this.previousReq) !== JSON.stringify(newReq);
  }

  public onRDLCModuleChange(selectedItem: any, selectedID: any) {
    if (selectedID) {
      this.isRDLCModuleSelected = true;
      this.databagRDLCService.rdlcTabs = [];
      let request = {
        "CountryCode": "ind",
        "CurrencyCode": "inr",
        "LanguageCode": "eng",
        "Code": selectedID
      };
      this.api.postService(GetRDLCTypeByModuleCode, request).subscribe({
        next: (response) => {
          const details = response?.Data?.Details ?? [];
          if (response?.ReturnCode === 0) {
            if (details.length === 0) {
              this.common.changeIsFailureeMessage(true);
              this.common.changeResponseMessage("No tabs found for this module.");
            }
            this.databagRDLCService.rdlcTabs = details;
            this.currentTabRDLCTypeID = details[0]?.Id;
            if (details.length === 1) {
              this.currentTabName = details[0]?.RDLCTypeName;
              this.changeTab(details, -1);
            }
            if (this.isModifyWorkFlow) {
              this.navigateToRDLCTypeTab();
              this.tabWorkflowStatus();
            }
          } else {
            this.common.changeIsFailureeMessage(true);
            this.common.changeResponseMessage("Couldn't load the Tabs. Please try again later.");
          }
        },
        error: () => {
          this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage("An error occurred while loading tabs.");
        }
      });
    }
  }

  public GetWorkFlowModule() {
    const request = {
      "CountryCode": "ind",
      "CurrencyCode": "inr",
      "LanguageCode": "eng"
    }
    this.api.postService(GetRDLCModule, request).subscribe({
      next: (response: any) => {
        this.mastersObject['RDLCModuleId'] = response?.Data?.length ? response.Data : [];
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }

  public getWorkflowType(): void {
    const req = {
      "Active": "true",
      "MasterDataCode": "WorkFlowType",
     
    };
    this.api.postService(GetMastersAPI, req).subscribe({
      next: (res: any) => {
        if (res?.ReturnCode === 0 && Array.isArray(res?.Data) && res.Data.length > 0) {
          this.mastersObject['WorkflowTypeId'] = res.Data;
        } else if (res?.ReturnCode === 0) {
          this.mastersObject['WorkflowTypeId'] = [];
        } else {
          this.mastersObject['WorkflowTypeId'] = [];
        }
        this.onPageLoadLoader = false;
      },
      error: (err: any) => {
        console.error(err);
        this.mastersObject['WorkflowTypeId'] = [];
        this.onPageLoadLoader = false;
      }
    });
  }

  public getRoles(): void {
    // WorkflowType dropdown (Role Based) triggers role fetch; toggle loader on Generate Workflow
    if (this.isRolesLoading || this.hasLoadedRoles) {
      return;
    }
    this.isRolesLoading = true;
    this.isLoadingModifyWorkflow = true;
    const req = {
      "Active": "true",
      "MasterDataCode": "Role",
       };
    this.api.postService(GetMastersAPI, req).subscribe({
      next: (response: any) => {
        if (response.ReturnCode == 0) {
          this.reactMasterRole = null;
          // Transform roles response to match users response structure
          // Users response has: { ReturnCode, ReturnMessage, Data: { ProjectMemberDetails: [...] } }
          // Roles response has: { ReturnCode, ReturnMessage, Data: [...] }
          // Transform roles to match users structure so widget can use it the same way
          this.reactMasterRole = {
            ReturnCode: response.ReturnCode,
            ReturnMessage: response.ReturnMessage,
            Data: {
              ProjectMemberDetails: response.Data || []
            }
          };
          console.log('Roles loaded:', this.reactMasterRole);
          console.log('Roles Data.ProjectMemberDetails:', this.reactMasterRole.Data?.ProjectMemberDetails);
          console.log('Number of roles:', this.reactMasterRole.Data?.ProjectMemberDetails?.length);
          if (this.reactMasterRole.Data?.ProjectMemberDetails?.length > 0) {
            console.log('First role example:', this.reactMasterRole.Data.ProjectMemberDetails[0]);
          }
          this.isLoadingModifyWorkflow = false;
          this.isRolesLoading = false;
          this.hasLoadedRoles = true;
          
          // Update widget API URLs if widget is already initialized
          this.updateWidgetApiUrls();
          
          // If widget is already displayed, try to refresh it
          if (this.isDisplayReactWidget && this.isWidgetLoaded) {
            // Small delay to ensure widget has processed the API URL update
            setTimeout(() => {
              this.refreshWidgetUsers();
            }, 200);
          }
        } else {
          this.reactMasterRole = null;
          this.isLoadingModifyWorkflow = false;
          this.isRolesLoading = false;
        }
      },
      error: (err: any) => {
        console.error(err);
        this.reactMasterRole = null;
        this.isLoadingModifyWorkflow = false;
        this.isRolesLoading = false;
      }
    });
  }

  private refreshWidgetUsers(): void {
    const widgetElement = document.querySelector('react-widget');
    if (widgetElement) {
      try {
        // Try to trigger a refresh by calling getUsers again
        const reactwidget = (window as any).reactwidget;
        if (reactwidget && reactwidget.setApiUrls) {
          const jwtToken = localStorage.getItem('jwtToken') ?? '';
          reactwidget.setApiUrls({
            getActions: () => Promise.resolve(this.reactMasterAction),
            getUsers: () => {
              console.log('getUsers called - returning:', this.reactMasterRole || this.reactMasterUser);
              return Promise.resolve(this.reactMasterRole || this.reactMasterUser);
            },
            getRoles: () => {
              console.log('getRoles called - returning:', this.reactMasterRole || this.reactMasterUser);
              return Promise.resolve(this.reactMasterRole || this.reactMasterUser);
            },
            getSaveButtonColour: () => Promise.resolve('#4b49ac'),
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (err) {
        console.error("Error refreshing widget users:", err);
      }
    }
  }

  private updateWidgetApiUrls(): void {
    const reactwidget = (window as any).reactwidget;
    if (reactwidget && (window as any).reactwidget._isInitialized) {
      const jwtToken = localStorage.getItem('jwtToken') ?? '';
      reactwidget.setApiUrls({
        getActions: () => Promise.resolve(this.reactMasterAction),
        getUsers: () => {
          // Return roles if available, otherwise return users
          const data = this.reactMasterRole || this.reactMasterUser;
          console.log('getUsers called in updateWidgetApiUrls - returning data:', data);
          return Promise.resolve(data);
        },
        getRoles: () => {
          const data = this.reactMasterRole || this.reactMasterUser;
          console.log('getRoles called in updateWidgetApiUrls - returning data:', data);
          return Promise.resolve(data);
        },
        getSaveButtonColour: () => Promise.resolve('#4b49ac'),
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Notify the widget that users/roles data has been updated
      const widgetElement = document.querySelector('react-widget');
      if (widgetElement) {
        try {
          // Dispatch a custom event to notify the React widget to refresh users/roles
          const refreshEvent = new CustomEvent('refresh-users-roles', {
            bubbles: true,
            composed: true,
            detail: {
              users: this.reactMasterUser,
              roles: this.reactMasterRole
            }
          });
          widgetElement.dispatchEvent(refreshEvent);
        } catch (err) {
          console.error("Error dispatching refresh-users-roles event:", err);
        }
      }
    }
  }

  private getWorkflowTypeFlags(workflowTypeId: any, workflowTypeName?: string): { isUserBased: boolean; isRoleBased: boolean } {
    const name = (workflowTypeName ?? '').toLowerCase().trim();
    const idStr = String(workflowTypeId ?? '').toLowerCase().trim();
    const userBasedId = String(
      this.mastersObject['WorkflowTypeId']?.find((item: any) => {
        const itemName = item?.Name?.toLowerCase?.().trim();
        return itemName === 'user based' || itemName === 'userbased';
      })?.Id ?? ''
    ).toLowerCase().trim();
    const roleBasedId = String(
      this.mastersObject['WorkflowTypeId']?.find((item: any) => {
        const itemName = item?.Name?.toLowerCase?.().trim();
        return itemName === 'role based' || itemName === 'rolebased';
      })?.Id ?? ''
    ).toLowerCase().trim();

    const isUserBased = name === 'user based' || name === 'userbased' || (Boolean(userBasedId) && idStr === userBasedId);
    const isRoleBased = name === 'role based' || name === 'rolebased' || (Boolean(roleBasedId) && idStr === roleBasedId);

    return { isUserBased, isRoleBased };
  }

  private getWorkflowTypeObject(workflowTypeId: any): any {
    if (!workflowTypeId) return null;
    return this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === workflowTypeId) ?? null;
  }

  public onWorkflowTypeChange(selectedItem: any, isProgrammatic: boolean = false): void {
    console.log('Workflow Type Changed:', selectedItem, 'isProgrammatic:', isProgrammatic);
    console.log('Masters Object:', this.mastersObject['WorkflowTypeId']);
    
    let selectedWorkflowType: any = null;
    let workflowTypeId: any = null;
    
    // Handle both cases: when selectedItem is an ID or an object
    if (selectedItem) {
      if (typeof selectedItem === 'object' && selectedItem.Id) {
        // If it's an object with Id property
        workflowTypeId = selectedItem.Id;
        selectedWorkflowType = selectedItem;
      } else {
        // If it's just an ID, find the object
        workflowTypeId = selectedItem;
        selectedWorkflowType = this.mastersObject['WorkflowTypeId']?.find((item: any) => item.Id === selectedItem);
      }
    }
    
    console.log('Selected Workflow Type Object:', selectedWorkflowType);
    console.log('Workflow Type ID:', workflowTypeId);
    
    if (selectedWorkflowType) {
      const workflowTypeName = selectedWorkflowType.Name;
      const { isUserBased, isRoleBased } = this.getWorkflowTypeFlags(workflowTypeId, workflowTypeName);
      console.log('Is User Based:', isUserBased, 'Is Role Based:', isRoleBased, 'Workflow Type Name:', workflowTypeName);
      
      // Update Project field validation based on workflow type
      // Don't clear any fields if this is a programmatic change
      if (isUserBased) {
        this.workflow.get('Project')?.setValidators(Validators.required);
        this.workflow.get('Project')?.updateValueAndValidity();
        if (!this.isModifyWorkFlow && !isProgrammatic) {
          //this.workflow.get('Project')?.enable();
        }
        // Clear roles when switching to User Based
        this.reactMasterRole = null;
        // If Project is selected, fetch users (skip for programmatic changes)
        if (!isProgrammatic) {
          const projectId = this.workflow.get('Project')?.value;
          if (projectId) {
            this.getProjectusers(projectId);
          }
        }
      } else if (isRoleBased) {
        // Project should be required for Role Based as well
        this.workflow.get('Project')?.setValidators(Validators.required);
        this.workflow.get('Project')?.updateValueAndValidity();
        if (!this.isModifyWorkFlow && !isProgrammatic) {
          //this.workflow.get('Project')?.enable();
        }
        // Clear users and fetch roles for Role Based workflow
        this.reactMasterUser = null;
        this.getRoles();
      } else {
        // Keep Project required for other workflow types as well
        this.workflow.get('Project')?.setValidators(Validators.required);
        this.workflow.get('Project')?.updateValueAndValidity();
        // Clear roles for other workflow types
        this.reactMasterRole = null;
      }
    } else {
      console.warn('Workflow type not found');
      // Keep Project required even if workflow type not resolved
      this.workflow.get('Project')?.setValidators(Validators.required);
      this.workflow.get('Project')?.updateValueAndValidity();
      this.reactMasterRole = null;
    }
  }

}