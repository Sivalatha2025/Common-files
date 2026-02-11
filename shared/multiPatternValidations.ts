import { AbstractControl, ValidatorFn } from "@angular/forms";

export function multiPatterns(patterns: RegExp[]): ValidatorFn {

    return (control: AbstractControl): { [key: string]: any } | null => {
        let pattern1 = patterns[0];
        let pattern2 = patterns[1];

        if (!patterns || patterns.length === 0) {
            return null; // No patterns provided, no validation performed
        }

        if (control.value != '') {
            if (pattern1.test(control.value) || pattern2.test(control.value)) {
                return null;
            }
            else {
                return { 'pattern': true };
            }
        }
        else {
            return { 'required': true };
        }

        return null
    }
}

export function regexValidation(patterns: RegExp[]):ValidatorFn{
    return (control: AbstractControl): { [key: string]: any } | null =>{
        let pattern1 = patterns[0];
        let pattern2 = patterns[1];
        if (!patterns || patterns.length === 0) {
            return null; // No patterns provided, no validation performed
        }
        if (control.value != '' && control.value != null && control.value != undefined ) {
            if (pattern1.test(control.value) || pattern2.test(control.value)) {
                return null;
            }
            else {
                return { 'pattern': true };
            }
        }
        return null;
    }

}