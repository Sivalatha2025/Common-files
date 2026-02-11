import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchPipe',
  pure: false
})
export class SearchPipePipe implements PipeTransform {

  transform(value: any, args?: any, department?: any): any {
    if (!value) {
      return [];
    }

    const searchTerm = args ? args.toLowerCase() : '';
    const searchDepartment = department ? department.toLowerCase() : '';

    return value.filter((item: any) => {
      const employeeNameMatch = searchTerm ? (item.EmployeeName.toLowerCase().includes(searchTerm) || item.EmployeeCode.toLowerCase().includes(searchTerm)) : true;
      const departmentMatch = searchDepartment ? item.Department.toLowerCase().includes(searchDepartment) : true;
      return employeeNameMatch && departmentMatch;
    });
  }

}


