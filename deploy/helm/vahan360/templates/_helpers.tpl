{{- define "vahan360.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "vahan360.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "vahan360.labels" -}}
app.kubernetes.io/name: {{ include "vahan360.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "vahan360.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- include "vahan360.fullname" . }}-secrets
{{- end }}
{{- end }}

{{- define "vahan360.image" -}}
{{- $registry := .Values.global.imageRegistry -}}
{{- $image := .image -}}
{{- if $registry -}}
{{- printf "%s/%s" $registry $image -}}
{{- else -}}
{{- $image -}}
{{- end -}}
{{- end }}

{{- define "vahan360.containerSecurityContext" -}}
{{- with .Values.global.containerSecurityContext }}
securityContext:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}
