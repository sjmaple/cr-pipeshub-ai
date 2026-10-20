import 'reflect-metadata'
import { expect } from 'chai'
import {
  answeredModelInfo,
  buildAIResponseMessage,
  formatPreviousConversations,
} from '../../../../src/modules/enterprise_search/utils/utils'
import type { IAIModel, IMessage } from '../../../../src/modules/enterprise_search/types/conversation.interfaces'

const routedRequest: IAIModel = {
  modelKey: 'chooser',
  modelName: 'chooser',
  modelProvider: '',
  chatMode: 'internal_search',
  modelFriendlyName: 'Chooser',
}

describe('Answered model persistence', () => {
  it('stores the model the AI service chose on the answer without touching the request modelInfo', () => {
    const before = { ...routedRequest }
    const message = buildAIResponseMessage(
      {
        statusCode: 200,
        data: {
          answer: 'hi',
          citations: [],
          modelInfo: {
            modelKey: 'k-large',
            modelName: 'gpt-5.6',
            modelProvider: 'openAI',
            reasoningEffort: 'high',
            routed: true,
            routingReason: 'example_reason',
          },
        },
      } as any,
      [],
      routedRequest,
    )
    expect(message.modelInfo).to.deep.equal({
      modelKey: 'k-large',
      modelName: 'gpt-5.6',
      modelProvider: 'openAI',
      chatMode: 'internal_search',
      reasoningEffort: 'high',
      routed: true,
      routingReason: 'example_reason',
    })
    expect(routedRequest).to.deep.equal(before)
  })

  it('drops an effort the message schema would reject', () => {
    const info = answeredModelInfo(routedRequest, {
      modelKey: 'k', modelName: 'm', modelProvider: 'openAI', chatMode: '', reasoningEffort: 'xhigh' as any, routed: true,
    })
    expect(info).to.not.have.property('reasoningEffort')
  })

  it('keeps the request modelInfo when the AI service did not choose the model', () => {
    const requested: IAIModel = { ...routedRequest, modelKey: 'k1', modelName: 'm1' }
    expect(answeredModelInfo(requested, undefined)).to.equal(requested)
    expect(answeredModelInfo(requested, { modelKey: 'x', modelName: 'y', modelProvider: '', chatMode: '' })).to.equal(requested)
  })

  it('sends the chosen model back as history so the AI service can keep the conversation on it', () => {
    const messages = [
      { messageType: 'user_query', content: 'q' },
      {
        messageType: 'bot_response',
        content: 'a',
        modelInfo: { modelKey: 'k-large', modelName: 'gpt-5.6', modelProvider: 'openAI', chatMode: 'x', reasoningEffort: 'high', routed: true },
      },
      { messageType: 'bot_response', content: 'b', modelInfo: { modelKey: 'k1', modelName: 'm1', modelProvider: '', chatMode: '' } },
    ] as unknown as IMessage[]
    const rows = formatPreviousConversations(messages)
    expect(rows[1]).to.include({ routed: true, modelKey: 'k-large', modelName: 'gpt-5.6', reasoningEffort: 'high' })
    expect(rows[2]).to.not.have.property('routed')
  })
})
