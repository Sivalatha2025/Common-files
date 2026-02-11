import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { JsonFormControls } from '../../components/add-page/schema.model';

@Pipe({
  name: 'formError',
  pure : false

})
export class FormErrorPipe implements PipeTransform {

  transform(value: JsonFormControls , control : AbstractControl | any): string {
    if (control?.hasError('required')) {
      return this.capitalizeFirstLetter(value?.RequiredErrorMessage || '');
    } else if (control?.hasError('pattern')) {
      return this.capitalizeFirstLetter(value.Pattern1ErrorMessage || '');
    } else if (control?.hasError('maxlength')) {
      return this.capitalizeFirstLetter(value.LengthErrorMessage|| '');
    } else if (control?.hasError('minlength')) {
      return this.capitalizeFirstLetter(value?.LengthErrorMessage|| '');
    } else if (control?.hasError('max')) {
      return this.capitalizeFirstLetter(value?.RangeErrorMessage || '');
    } else if (control?.hasError('min')) {
      return this.capitalizeFirstLetter(value?.RangeErrorMessage || '');
    } else if (control?.hasError('rangeOverlap')) {
      return 'Range already exists or falls under existing ranges.';
    }
    else {
      return this.capitalizeFirstLetter(value?.Pattern1ErrorMessage|| '');
    }
    return '';
  }

  capitalizeFirstLetter(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

}
