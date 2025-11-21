import { v4 as uuidv4 } from 'uuid';

/**
 * Substitui variáveis do CRM no formato {@nomeVariavel} por seus valores
 * Ignora variáveis do n8n no formato {{variavel}} e {variavel} que não têm o prefixo @
 * Percorre recursivamente o objeto JSON do workflow
 */
export function replaceVariables(
  workflowJson: any,
  variables: Record<string, any>,
): any {
  // Se for string, procura por padrões {@variavel} (com prefixo @) e substitui
  // Ignora padrões {{variavel}} (chaves duplas) e {variavel} (sem @) que são variáveis do n8n
  if (typeof workflowJson === 'string') {
    return replaceVariablesInString(workflowJson, variables);
  }

  // Se for array, processa cada item
  if (Array.isArray(workflowJson)) {
    return workflowJson.map((item) => replaceVariables(item, variables));
  }

  // Se for objeto, processa cada propriedade
  if (typeof workflowJson === 'object' && workflowJson !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(workflowJson)) {
      result[key] = replaceVariables(value, variables);
    }
    return result;
  }

  // Outros tipos (number, boolean, null) retornam como estão
  return workflowJson;
}

/**
 * Substitui variáveis do CRM em uma string
 * Suporta os formatos:
 * - {@variavel} - substituição simples (com prefixo @)
 * - {@variavel|default} - com valor padrão se variável não existir
 * 
 * IMPORTANTE: 
 * - Ignora variáveis do n8n no formato {{variavel}} (chaves duplas)
 * - Ignora variáveis do n8n no formato {variavel} (sem prefixo @)
 * - Apenas variáveis com prefixo @ são substituídas
 */
function replaceVariablesInString(
  str: string,
  variables: Record<string, any>,
): string {
  // Procurar apenas variáveis do CRM com prefixo {@variavel}
  // Estratégia: proteger variáveis do n8n {{}} e {} (sem @), depois processar apenas {@variavel}
  
  // 1. Proteger variáveis do n8n {{}} substituindo por placeholder temporário
  const n8nVariablePlaceholders = new Map<string, string>();
  let placeholderIndex = 0;
  const protectedStr1 = str.replace(/\{\{([^}]+)\}\}/g, (match) => {
    const placeholder = `__N8N_VAR_DOUBLE_${placeholderIndex++}__`;
    n8nVariablePlaceholders.set(placeholder, match);
    return placeholder;
  });

  // 2. Proteger variáveis do n8n {} (sem prefixo @) substituindo por placeholder temporário
  // Não capturar {@variavel} - essas são variáveis do CRM
  const protectedStr2 = protectedStr1.replace(/\{([^@}][^}]*)\}/g, (match) => {
    // Se não começa com @, é variável do n8n, proteger
    const placeholder = `__N8N_VAR_SINGLE_${placeholderIndex++}__`;
    n8nVariablePlaceholders.set(placeholder, match);
    return placeholder;
  });

  // 3. Processar apenas variáveis do CRM com prefixo {@variavel}
  const processedStr = protectedStr2.replace(/\{@([^}]+)\}/g, (match, varName) => {
    const trimmedVarName = varName.trim();

    // Suporta formato com valor padrão: {@variavel|default}
    const [name, defaultValue] = trimmedVarName.split('|').map((s) => s.trim());

    // Se a variável existe, usa seu valor
    if (name in variables) {
      const value = variables[name];
      // Converte para string, exceto undefined/null que retornam vazio
      return value !== undefined && value !== null ? String(value) : '';
    }

    // Se tem valor padrão, usa ele
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // Se não tem valor e não tem default, mantém o placeholder
    return match;
  });

  // 4. Restaurar variáveis do n8n {{}} e {}
  let finalStr = processedStr;
  n8nVariablePlaceholders.forEach((original, placeholder) => {
    finalStr = finalStr.replace(placeholder, original);
  });

  return finalStr;
}

/**
 * Gera um UUID único para ser usado como webhook path
 */
export function generateUniqueWebhookPath(): string {
  return uuidv4();
}

/**
 * Substitui o webhook path em todos os nodes do tipo webhook no workflow
 */
export function replaceWebhookPath(
  workflowJson: any,
  newWebhookPath: string,
): any {
  const workflow = JSON.parse(JSON.stringify(workflowJson)); // Deep clone

  if (workflow.nodes && Array.isArray(workflow.nodes)) {
    workflow.nodes = workflow.nodes.map((node: any) => {
      // Verifica se é um node do tipo webhook
      if (
        node.type === 'n8n-nodes-base.webhook' &&
        node.parameters &&
        typeof node.parameters.path === 'string'
      ) {
        return {
          ...node,
          parameters: {
            ...node.parameters,
            path: newWebhookPath,
          },
          webhookId: newWebhookPath, // Também atualiza webhookId se existir
        };
      }
      return node;
    });
  }

  return workflow;
}

/**
 * Valida se todas as variáveis obrigatórias foram fornecidas
 */
export function validateRequiredVariables(
  templateVariables: Record<string, any>,
  providedVariables: Record<string, any>,
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const [varName, varConfig] of Object.entries(templateVariables)) {
    if (
      varConfig.required &&
      (!(varName in providedVariables) ||
        providedVariables[varName] === undefined ||
        providedVariables[varName] === null ||
        providedVariables[varName] === '')
    ) {
      missingFields.push(varConfig.label || varName);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Processa o workflow completo: substitui variáveis e webhook path
 */
export function processWorkflowTemplate(
  templateWorkflowData: any,
  variables: Record<string, any>,
  newWebhookPath?: string,
): any {
  // 1. Substitui variáveis
  let processedWorkflow = replaceVariables(templateWorkflowData, variables);

  // 2. Substitui webhook path se fornecido
  if (newWebhookPath) {
    processedWorkflow = replaceWebhookPath(processedWorkflow, newWebhookPath);
  }

  return processedWorkflow;
}

