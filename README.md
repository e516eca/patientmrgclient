# Angular 21 Patient Management

A standalone Angular 21 front end for an ASP.NET Core Web API that reads and updates a FHIR server.

## Included features

- Feature-based application structure
- Standalone components and lazy-loaded routes
- Angular Signals for view state, search, and client-side pagination
- Reactive Forms with required-field and future-date validation
- Bootstrap 5 responsive UI
- Typed service layer that contains all HTTP communication
- Patient list, name search, pagination, create, edit, delete, and detail view
- FHIR R4 `Patient` JSON generated for create and update
- Response normalization for common camelCase, PascalCase, array, paged-envelope, and FHIR Bundle list responses

## API endpoints

- `GET https://localhost:7001/api/Patient/all`
- `GET https://localhost:7001/api/PatientDetails/patient?patientId={id}`
- `POST https://localhost:7001/api/Patient/create`
- `PUT https://localhost:7001/api/Patient/Edit`
- `DELETE https://localhost:7001/api/Patient/patient?patientId={id}`

The update request sends the patient ID in the FHIR Patient resource's `id` property.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Production build

```bash
npm run build:production
```

The output is generated in `dist/angular-patient-management/browser`.

## ASP.NET Core requirements

The API must be running at `https://localhost:7001`. Trust the ASP.NET development certificate if the browser rejects it:

```bash
dotnet dev-certs https --trust
```

Allow the Angular development origin in the API CORS policy. A typical policy is:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularClient", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

app.UseCors("AngularClient");
```

## FHIR create payload

```json
{
  "resourceType": "Patient",
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["Jane"]
    }
  ],
  "gender": "female",
  "birthDate": "1988-05-12"
}
```

Update uses the same payload with an additional `id` field.

## Configuration

Change the API base URL in:

`src/environments/environment.ts`

## Notes about list pagination

The requested `/Patient/all` endpoint implies that the API returns all patients. The UI therefore performs pagination after loading the collection. If the backend later supports server-side pagination, update `PatientApiService.getAllPatients()` to send page parameters and consume the backend's paging metadata.
