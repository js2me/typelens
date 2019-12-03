export class TypeLensConfiguration {
  public blackbox: string[] = [];
  public blackboxTitle: string = "<< called from blackbox >>";
  public excludeself: boolean = true;
  public singular: string = "{0} reference";
  public plural: string = "{0} references";
  public noreferences: string = "no references";
  public unusedcolor: string = "#999";
  public decorateunused: boolean = true;
  public skiplanguages: string[] = ["csharp"];
  public ignorelist: string[] = ["ngOnChanges", "ngOnInit", "ngDoCheck", "ngAfterContentInit", "ngAfterContentChecked", "ngAfterViewInit", "ngAfterViewChecked", "ngOnDestroy"];

  public showReferencesForMethods = true;
  public showReferencesForFunctions = true;
  public showReferencesForProperties = true;
  public showReferencesForClasses = true;
  public showReferencesForInterfaces = true;
  public showReferencesForVariables = true;
  public showReferencesForEnums = true;
}